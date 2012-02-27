$(function() {
  var renderField = function(field) {
    for(var i = 0; i < 9; ++i) {
      for(var j = 0; j < 9; ++j) {
        var cell = $('#' + i + '_' + j);
        var cellStatus = field[i][j];

        if(cellStatus === "BOMB") {
          cell.attr('class', 'cell bgout');
          cell.text("('A`)");
        } else if(cellStatus === null){
          cell.attr('class', 'cell bgnormal');
          cell.text('');
        } else {
          cell.attr('class', 'cell bgsafe');
          if(cellStatus !== 0 ) {
            cell.text(cellStatus);
          } else {
            cell.text('');
          }
        }
      }
    };
  };

  var socket = io.connect();

  socket.on('field push', function(field) {
    renderField(field);
  });

  socket.on('msg push', function(msg) {
    $('#msg').text(msg);
  });

  socket.on('count push', function(count) {
    $('#count').text(count);
  });

  socket.on('users push', function(users) {
    console.log(users);
  });

  $('.cell').click(function(evn) {
    var cell = evn.currentTarget;
    var pos = cell.id.split('_');
    for(var i = 0; i < pos.length; ++i) {
      pos[i] = parseInt(pos[i], 10);
    }

    socket.emit('pos send', pos);
  });

  $('#reset').click(function(evn) {
    socket.emit('reset send');
  });
});
