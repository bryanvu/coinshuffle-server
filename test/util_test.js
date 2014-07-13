'use strict';

var should = require('chai').should()
var bitcore = require('bitcore')
var TransactionBuilder = bitcore.TransactionBuilder
var Util = require('../util')


describe('Util', function() {
  describe('#lookupInputs()', function() {
    it('should return a list of txids, indexs and amounts corresponding to an address', function (done) {

      Util.lookupInputs('mov5oqbyUbniQj9yMDFohaUJYTHDjcrzZG', function (items) {
        items[0].txid.should.equal('810c1d15bf5ac8fc745290167e5fb264621c5ae9d1a745b0945cce7a91d47df0')
        items[0].index.should.equal(1)
        items[0].amount.should.equal(75000000)
        done()
      })
    })
  })

  describe('#getInputs()', function() {
    it('should callback with an array of detailed input info', function(done) {
      var inputAddresses = [
        'mxwUzywvdtJbajcyw7MyaQ7YUT8r6AKbmD',
        'mn3HsR1gfvc8jbMwRjrDGhAGZpdpDcWbrP'
      ]

      var resultList = []

      Util.getInputs(inputAddresses, function (inputInfoList) {
        inputInfoList.length.should.equal(2)
        done()
      })
    })
  })

  describe('#generateChangeOutputs()', function() {
    it('should return a list of addresses and amounts', function (done) {

      var denomination = 100000000
      var inputAndChangeAddresses = [
        { inputAddress: 'mxwUzywvdtJbajcyw7MyaQ7YUT8r6AKbmD', changeAddress: 'mjfAkaDp223vphasE89o6Jt2efjEYisyzy'},
        { inputAddress: 'mn3HsR1gfvc8jbMwRjrDGhAGZpdpDcWbrP', changeAddress: 'mxepKX23agWwNWczc2gaH9wkXJLy2vpzVQ'}
      ]

      var inputList = [
        [ { txid: 'b5af8269416e36a8bd86f226c460413253ade77cca955ed475cd6535e16e60b1',
            index: 1,
            amount: 73000000,
            address: 'mxwUzywvdtJbajcyw7MyaQ7YUT8r6AKbmD',
            scriptPubKey: '76a914bf1dc0d22437ac8e7d1af25cec87649e629e398588ac',
            confirmations: 6 },
          { txid: 'e90d846e9ec0243c8f3cb4c3365c5538da206b76e4ab4a0730429e0ba401f2c4',
            index: 1,
            amount: 74000000,
            address: 'mxwUzywvdtJbajcyw7MyaQ7YUT8r6AKbmD',
            scriptPubKey: '76a914bf1dc0d22437ac8e7d1af25cec87649e629e398588ac',
            confirmations: 6 } ],
        [ { txid: '42527625ce8a46a653f982e2aef288d55e2194de702c5e993b31318e08f73553',
            index: 0,
            amount: 73000000,
            address: 'mn3HsR1gfvc8jbMwRjrDGhAGZpdpDcWbrP',
            scriptPubKey: '76a914478d92f8231675874197c2da5d33b315bf5c71ff88ac',
            confirmations: 6 },
          { txid: '82f1280400a64ddbd5eae52cc11f310334a4915e511de9b6385c5008a5e148d7',
            index: 0,
            amount: 72000000,
            address: 'mn3HsR1gfvc8jbMwRjrDGhAGZpdpDcWbrP',
            scriptPubKey: '76a914478d92f8231675874197c2da5d33b315bf5c71ff88ac',
            confirmations: 6 } ]
        ]

      Util.generateChangeOutputs(inputAndChangeAddresses, inputList, denomination, function (changeOutputs) {
        changeOutputs[0].address.should.equal('mjfAkaDp223vphasE89o6Jt2efjEYisyzy')
        changeOutputs[0].amount.should.equal(47000000)
        changeOutputs[1].address.should.equal('mxepKX23agWwNWczc2gaH9wkXJLy2vpzVQ')
        changeOutputs[1].amount.should.equal(45000000)
        done()
      })
    })
  })

  describe('#createTransaction()', function() {
    it('should return a valid transaction', function(done) {

      var inputAndChangeAddresses = [
        { inputAddress: 'mxwUzywvdtJbajcyw7MyaQ7YUT8r6AKbmD', changeAddress: 'mjfAkaDp223vphasE89o6Jt2efjEYisyzy'},
        { inputAddress: 'mn3HsR1gfvc8jbMwRjrDGhAGZpdpDcWbrP', changeAddress: 'mxepKX23agWwNWczc2gaH9wkXJLy2vpzVQ'}
      ]

      var outputList = [
        'mrmz3Af8aKv3R4JPa6L4aA9maGGEbcVJZF',
        'mjBUkY5QkjtdcUL6R9hLtKg312ecNRYh2Q'
      ]

      var denomination = 100000000

      Util.createTransaction(inputAndChangeAddresses, outputList, denomination, function(builder) {
        var transaction = TransactionBuilder.fromObj(JSON.parse(builder))

        transaction.tx.ins.length.should.equal(4)
        transaction.tx.outs.length.should.equal(4)
        done()
      })
    })
  })
})

