'use strict';

var bitcore = require('bitcore')
var TransactionBuilder = bitcore.TransactionBuilder
var PeerManager = bitcore.PeerManager
var Peer = bitcore.Peer
var Util = require('./util')
var Config = require('./config')
var config = new Config()


var start = function (io) {
  var currentShuffles = {}
  var completedShuffles = []

  var adminSocket = io.of('/admin')
  adminSocket.on('connection', function (socket) {
    console.log('Admin connected')
    adminSocket.emit('update_current_shuffles', currentShuffles)
    adminSocket.emit('update_completed_shuffles', completedShuffles)
  })


  io.on('connection', function(socket) {
    var roomName = ''
    var denomination = 0

    socket.on('register', function(shuffleRequest) {
      // Assign rooms based on denomination
      switch (shuffleRequest.denomination) {
        case 100000000:
          roomName = '1 BTC'
          denomination = shuffleRequest.denomination
          break;
        case 10000000:
          roomName = '0.1 BTC'
          denomination = shuffleRequest.denomination
          break;
      }

      var peerInfo = {
        inputAddress: shuffleRequest.inputAddress,
        changeAddress: shuffleRequest.changeAddress,
        pubKey: shuffleRequest.pubKey
      }

      if (currentShuffles[roomName] === undefined) {
        currentShuffles[roomName] = {}
        currentShuffles[roomName].id = generateId()
        currentShuffles[roomName].peerInfoList = []
      }

      if (isUniqueAddress(shuffleRequest.inputAddress, currentShuffles[roomName].peerInfoList)) {
        currentShuffles[roomName].peerInfoList.push(peerInfo)
        socket.join(roomName)

        if (currentShuffles[roomName].peerInfoList.length >= config.threshold) {
          var pubKeys = currentShuffles[roomName].peerInfoList.map( function (peerInfo) {
            return peerInfo.pubKey
          })

          pubKeys = Util.randomizeOrder(pubKeys)
          io.to(roomName).emit('encrypt_output', pubKeys)
        }
        socket.emit('registration_result', { status: 'successful' })
      } else {
        socket.emit('registration_result', { status: 'duplicate' })
      }

      adminSocket.emit('update_current_shuffles', currentShuffles)
    })

    socket.on('encrypted_output', function (encryptedOutput) {
      if (currentShuffles[roomName].encryptedOutputs === undefined) {
        currentShuffles[roomName].encryptedOutputs = []
      } 

      currentShuffles[roomName].encryptedOutputs.push(encryptedOutput)

      if (currentShuffles[roomName].encryptedOutputs.length >= config.threshold) {
        currentShuffles[roomName].strEncryptedOutputs = currentShuffles[roomName].encryptedOutputs.map( function (output) {
          return output.toString('hex')
        })

        adminSocket.emit('update_current_shuffles', currentShuffles)
        io.to(roomName).emit('decrypt_and_shuffle_outputs', currentShuffles[roomName].encryptedOutputs)
      }
    })

  socket.on('partially_decrypted_outputs', function (partiallyDecryptedOutputs) {
      if (currentShuffles[roomName].partiallyDecryptedOutputsList === undefined) {
        currentShuffles[roomName].partiallyDecryptedOutputsList = []
        currentShuffles[roomName].strPartiallyDecryptedOutputsList = {}
      }

      currentShuffles[roomName].partiallyDecryptedOutputsList.push(partiallyDecryptedOutputs)

      var strPartiallyDecryptedOutputs = []

      if (currentShuffles[roomName].partiallyDecryptedOutputsList.length >= config.threshold) {
        strPartiallyDecryptedOutputs = partiallyDecryptedOutputs.map( function (output) {
          return String.fromCharCode.apply(null, new Uint8Array(output))
        })

        var decryptedOutputs = partiallyDecryptedOutputs
        var inputAddresses = []
        var changeAddresses = []

        currentShuffles[roomName].peerInfoList.forEach( function (peerInfo) {
          inputAddresses.push(peerInfo.inputAddress)
          changeAddresses.push(peerInfo.changeAddress)
        })

        Util.createTransaction(inputAddresses, changeAddresses, decryptedOutputs, denomination, function (transaction) {
          io.to(roomName).emit('request_transaction_signature', {
            'transaction': transaction,
            'inputAddresses': inputAddresses,
            'inputIndex': 0})

          var unsignedTx = TransactionBuilder.fromObj(JSON.parse(transaction)).build()
          currentShuffles[roomName].unsignedTx = unsignedTx.getStandardizedObject()
        })
      } else {
        strPartiallyDecryptedOutputs = partiallyDecryptedOutputs.map( function (output) {
          return output.toString('hex')
        })
        io.to(roomName).emit('decrypt_and_shuffle_outputs', partiallyDecryptedOutputs)
      }

      var label = 'shuffle step ' + currentShuffles[roomName].partiallyDecryptedOutputsList.length

      currentShuffles[roomName].strPartiallyDecryptedOutputsList[label] = strPartiallyDecryptedOutputs
      adminSocket.emit('update_current_shuffles', currentShuffles)
    })

    socket.on('transaction_input_signed', function (signatureResponse) {
      if (signatureResponse.inputIndex < config.threshold - 1) {
        var inputAddresses = currentShuffles[roomName].peerInfoList.map( function (peerInfo) {
          return peerInfo.inputAddress
        })

        io.to(roomName).emit('request_transaction_signature', {
          'transaction': signatureResponse.transaction,
          'inputAddresses': inputAddresses,
          'inputIndex': signatureResponse.inputIndex + 1})
      } else {

        var signedTransaction = TransactionBuilder.fromObj(JSON.parse(signatureResponse.transaction))

        var tx = signedTransaction.build()
        var hexTx = tx.serialize().toString('hex')

        currentShuffles[roomName].signedTx = tx.getStandardizedObject()
        currentShuffles[roomName].hexTx = hexTx

        var peerman = new PeerManager({
          network: 'testnet'
        })

        peerman.addPeer(new Peer(config.bitcoind_host, config.bitcoind_port))

        peerman.on('connect', function() {
          var conn = peerman.getActiveConnection()
          if (conn) {
            var txid = tx.getHash().toString('hex')
            console.log('Created transaction with txid ' + txid)
            var raw_tx = tx.serialize().toString('hex')
            console.log('Transaction raw hex dump:')
            console.log(raw_tx)
            conn.sendTx(tx)
            setTimeout(function() {
              peerman.stop()
            }, 2000)
          }
        })

        peerman.start()
        completedShuffles.unshift(currentShuffles[roomName])
        currentShuffles[roomName] = undefined

        if (completedShuffles.length >= 10) {
          completedShuffles = completedShuffles.slice(0, 10)
        }

        adminSocket.emit('update_current_shuffles', currentShuffles)
        adminSocket.emit('update_completed_shuffles', completedShuffles)
        io.to(roomName).emit('shuffle_complete')
      }
    })
  })
}

function generateId() {
    var length = 6
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

function isUniqueAddress(address, inputAndChangeAddresses) {
  var isUnique = true

  if (inputAndChangeAddresses !== undefined) {
    inputAndChangeAddresses.forEach( function (addresses) {
      if (address === addresses.inputAddress) {
        isUnique = false
      }
    })
  }
  return isUnique
}

exports.start = start
exports.config = config





