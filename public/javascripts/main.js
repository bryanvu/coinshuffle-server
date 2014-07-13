/*jshint jquery:true */
/*jshint quotmark:false */
/*global io, renderjson */
'use strict';

var socket = io('/admin')

socket.on('update_current_shuffles', function (currentShuffles) {
  if (!jQuery.isEmptyObject(currentShuffles)) {
    $('#current_shuffles').html("<h3>Pending shuffles:</h3>")
  } else {
    $('#current_shuffles').html("")
  }

  $.each(currentShuffles, function (room, shuffle) {
    renderShuffle($('#current_shuffles'), shuffle, room)
  })
})

socket.on('update_completed_shuffles', function (completedShuffles) {
  if (completedShuffles.length > 0) {
    $('#completed_shuffles').html("<h3>Completed shuffles:</h3>")
  } else {
    $('#completed_shuffles').html("")
  }

  $.each(completedShuffles, function (room, shuffle) {
    renderShuffle($('#completed_shuffles'), shuffle)
  })  
})

function renderShuffle (selector, shuffle, room) {
  selector.append("<div class='shuffle' id='" + shuffle.id + "'/>")

  var shuffleDiv = selector.find('#' + shuffle.id)
  shuffleDiv.append("<h3 id='shuffle_title'><span id=shuffle_title_header>Shuffle ID: </span>" + shuffle.id + "</h3>")
  if (room !== undefined) {
    shuffleDiv.append("<h4>Denomination: " + room + "</h4>")    
  }
  
  var peerCount = shuffle.peerInfoList.length
  shuffleDiv.append("<br><br><div id='peer_count' />")
  shuffleDiv.find('#peer_count').html("<b>Number of peers connected:</b> " + peerCount + "<br>")
  
  // Client info tables
  shuffleDiv.append("<br><br><div id='peer_info_list' />")
  
  $.each(shuffle.peerInfoList, function(index, peerInfo) {
    shuffleDiv.find('#peer_info_list').append("<table class='table' id='peer_" + index + "'/>")

    var peerInfoTable = shuffleDiv.find('#peer_info_list #peer_' + index)

    peerInfoTable.append("<tr><th>Peer&nbsp;" + (index + 1) + "</th><th>Input address: </th><td>" + peerInfo.inputAddress + "</td></tr>")
    peerInfoTable.append("<tr><td></td><th>Change address: </th><td>" + peerInfo.changeAddress + "</td></tr>")
    peerInfoTable.append("<tr><td></td><th>Public key: </th><td>" + peerInfo.pubKey + "</td></tr>")
  })

  if (shuffle.strEncryptedOutputs !== undefined) {
    shuffleDiv.append("<br><br><div id='encrypted_outputs' />")

    shuffleDiv.find('#encrypted_outputs').html("<table id='initial_outputs' class='table ciphertext'/>")

    var encryptedOutputsTable = shuffleDiv.find('#encrypted_outputs #initial_outputs')
    encryptedOutputsTable.append("<tr><th>Initial encrypted outputs: </th></tr>")    

    $.each(shuffle.strEncryptedOutputs, function(index, output) {
      var truncatedOutput = $.trim(output).substring(0, 50)

      encryptedOutputsTable.append("<tr><td><div class='truncated_output' id='output_" + truncatedOutput + "'>" + truncatedOutput + "...</div></td></tr>")
      $('#output_' + truncatedOutput).append("<div class='encrypted_output well well-sm'>" + output + "</div>")
      $('#output_' + truncatedOutput).click( function() {
        $('#output_' + truncatedOutput + ' .encrypted_output').slideToggle()
      })
    })
  }

  if (shuffle.strPartiallyDecryptedOutputsList !== undefined) {
    shuffleDiv.append("<br><div id='part_decrypted_outputs' />")

    var outputsDiv = shuffleDiv.find('#part_decrypted_outputs')

    outputsDiv.html("<h5>Shuffle detail: </h5>")    
    shuffleDiv.find('#part_decrypted_outputs').append(renderjson.set_show_to_level(1)(shuffle.strPartiallyDecryptedOutputsList))  
    
  }

  if (shuffle.unsignedTx !== undefined) {
    shuffleDiv.append("<br><br><div id='unsigned_tx' />")
    shuffleDiv.find('#unsigned_tx').html('<b>Unsigned transaction:</b> <br><br>')
    shuffleDiv.find('#unsigned_tx').append(renderjson.set_show_to_level(1)(shuffle.unsignedTx))      
  }

  if (shuffle.signedTx !== undefined) {
    shuffleDiv.append("<br><br><div id='signed_tx' />")
    shuffleDiv.find('#signed_tx').html('<b>Signed transaction:</b> <br><br>')
    shuffleDiv.find('#signed_tx').append(renderjson.set_show_to_level(1)(shuffle.signedTx))      
  }

  if (shuffle.hexTx !== undefined) {
    shuffleDiv.append("<br><br><div id='hex_tx' />")
    shuffleDiv.find('#hex_tx').html('<b>Hex transaction:</b> <br><br>')
    shuffleDiv.find('#hex_tx').append(shuffle.hexTx)     
  }
}
