'use strict';

// Start server for testing, would ideally refactor out.
var app = require('../app')
app.set('port', process.env.PORT || 3000)

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
})

var io = require('socket.io')(server)
var shuffler = require('../server')

shuffler.start(io)


// Tests below...

var clientio = require('socket.io-client')
var socketURL = 'http://0.0.0.0:3000';

var options ={
  transports: ['websocket'],
  'forceNew': true
};

describe('Shuffle Server',function(){
  describe('register event', function() {
    it('should create a room for the shuffle client based on its denomination', function() {
      var client1 = clientio.connect(socketURL, options)

      client1.on('connect', function (socket) {
        client1.emit('register', { denomination: 100000000 })
      })

      client1.on('room_joined', function (data) {
        data.roomName.should.equal('shuffle_1btc')
      })

      client1.disconnect()
    })

    it('should assign rooms based on denomination', function() {
      var client2 = clientio.connect(socketURL, options)
      var client3 = clientio.connect(socketURL, options)

      client2.on('connect', function (socket) {
        client2.emit('register', { denomination: 100000000 } )
      })

      client3.on('connect', function (socket) {
        client3.emit('register', { denomination: 10000000 } )
      })

      client2.on('room_joined', function (data) {
        data.roomName.should.equal('shuffle_1btc')
        client2.disconnect()
      })

      client3.on('room_joined', function (data) {
        data.roomName.should.equal('shuffle_0.1btc')
        client3.disconnect()
      })
    })
    })
});