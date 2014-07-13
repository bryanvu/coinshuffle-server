'use strict';

var bitcore = require('bitcore')
var networks = bitcore.networks

module.exports = function() {
  switch(process.env.NODE_ENV) {
    case 'production':
      return {
        shuffle_host: '127.0.0.1',
        shuffle_port: 80,
        insight_api_host: '127.0.0.1',
        insight_api_port: '3001',
        bitcoind_host: '127.0.0.1',
        bitcoind_port: 18333,
        network: networks.livenet,
        spendUnconfirmed: false,
        threshold: 10
      }
    default:
      return {
        shuffle_host: '127.0.0.1',
        shuffle_port: 3000,
        insight_api_host: '127.0.0.1',
        insight_api_port: '3001',
        bitcoind_host: '127.0.0.1',
        bitcoind_port: 18333,
        network: networks.testnet,
        spendUnconfirmed: true,
        threshold: 10
      }
  }
}