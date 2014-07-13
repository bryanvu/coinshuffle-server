'use strict';

var async = require('async')
var http = require('http')
var bitcore = require('bitcore')
var TransactionBuilder = bitcore.TransactionBuilder
var Config = require('./config')
var config = new Config()


var lookupInputs = function(address, callback) {
  var options = {
    host: config.insight_api_host,
    port: config.insight_api_port,
    path: '/api/addr/' + address + '/utxo',
    method: 'GET'
  }

  var req = http.request(options, function (res) {
    var str = ''

    res.on('data', function (chunk) {
      str += chunk
    })

    res.on('end', function () {
      var inputInfoList = []
      var json = JSON.parse(str)

      json.forEach(function (output) {
        inputInfoList.push({
          'txid': output.txid,
          'index': output.vout,
          'amount': output.amount * 100000000,
          'address': output.address,
          'scriptPubKey': output.scriptPubKey,
          'confirmations': output.confirmations
        })
      })

      callback(inputInfoList)
    })
  })

  req.end()

  req.on('error', function(e){
    console.error('Error: ' + e.message);
  })
}


var getInputs = function(inputAddresses, callback) {
  var inputList = []

  async.map(inputAddresses, function (address, callback) {
    lookupInputs(address, function (inputInfoList) {
      callback(null, inputInfoList)
    })
  }, function (err, results) {
    callback(results)
  })
}

var generateChangeOutputs = function(changeAddresses, inputList, denomination, callback) {
  var changeOutputs = []

  changeAddresses.forEach(function (address, index) {
    var totalInputAmount = 0
    inputList[index].forEach( function (inputInfo) {
      totalInputAmount += inputInfo.amount
    })

    var changeAmount = totalInputAmount - denomination
    changeOutputs.push({'address': address, 'amount': changeAmount})
  })

  callback(changeOutputs)
}

var createTransaction = function(inputAddresses, changeAddresses, outputList, denomination, callback) {
  getInputs(inputAddresses, function (inputList) {
    generateChangeOutputs(changeAddresses, inputList, denomination, function (changeOutputs) {
      var totalAmount = 0
      var unspent = []
      inputList.forEach(function (inputs) {
        inputs.forEach(function (input) {
          unspent.push({
            txid: input.txid,
            address: input.address,
            vout: input.index,
            amount: input.amount/100000000,
            scriptPubKey: input.scriptPubKey,
            confirmations: input.confirmations
          })
          totalAmount += input.amount
        })
      })

      var outs = []
      outputList.forEach(function (output) {
        outs.push({
          address: output.toString(),
          amount: denomination/100000000
        })
      })

      changeOutputs.forEach(function (output, index) {
        var outputAmount = output.amount/100000000

        if (index === 0) {
          outputAmount -= 0.0001
        }

        outs.push({
          address: output.address.toString(),
          amount: outputAmount
        })
      })

      var opts = {
       spendUnconfirmed: config.spendUnconfirmed
      }

      var builder = (new TransactionBuilder(opts))
        .setUnspent(unspent)
        .setOutputs(outs)

      callback(JSON.stringify(builder.toObj()))
    })
  })
}


function randomizeOrder(array) {
  var currentIndex = array.length
  var temporaryValue
  var randomIndex

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

exports.getInputs = getInputs
exports.lookupInputs = lookupInputs
exports.generateChangeOutputs = generateChangeOutputs
exports.createTransaction = createTransaction
exports.randomizeOrder = randomizeOrder

