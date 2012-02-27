
/**
 * Module dependencies.
 */

var express = require('express')
  , socketio = require('socket.io')
  , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var listeningPort = null;
app.configure('development', function(){
	listeningPort = 3000;
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	listeningPort = 80;
  app.use(express.errorHandler());
});

// Routes
app.get('/', function(req, res){
  res.render('index', { title: '地雷探し' });
});

app.listen(listeningPort);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

var io = socketio.listen(app);

var FIELD_WIDTH = 9;
var FIELD_HEIGHT = 9;

var userCount = 0; 

var createField = function() {
  var field = new Array(FIELD_WIDTH);
  for( var i = 0; i < FIELD_WIDTH; ++i) {
    field[i] = new Array(FIELD_HEIGHT);
    for( var j = 0; j < FIELD_HEIGHT; ++j) {
      field[i][j] = null;
    } 
  }
  return field;
}

var initializeField = function(field) {
  for( var i = 0; i < FIELD_WIDTH; ++i) {
    for( var j = 0; j < FIELD_HEIGHT; ++j) {
      field[i][j] = null;
    } 
  }
  return field;
}

var setRandomMineField = function(mineField, numberOfMines) {
  var mineArray = new Array(FIELD_WIDTH * FIELD_HEIGHT);

  for(var i = 0; i < mineArray.length; ++i) {
    mineArray[i] = i < numberOfMines ? true : false;
  }

  for(var i = 0; i < mineArray.length; ++i) {
    var j = parseInt(Math.random() * mineArray.length, 10);
    var tmp = mineArray[i];
    mineArray[i] = mineArray[j];
    mineArray[j] = tmp;
  }


  for(var i = 0; i < mineArray.length; ++i) {
    var _i = parseInt(i % FIELD_WIDTH, 10);
    var _j = parseInt(i / FIELD_HEIGHT, 10);
    mineField[_i][_j] = mineArray[i];
  }

  return mineField;
}

var users = {}
var field = createField();
var mineField = setRandomMineField(createField(), 10);

var countMines = function (field, x, y) {
  var n = 0;
  if(y - 1 >= 0) {
    if(mineField[x][y-1]) ++n;

    if(x - 1 >= 0) { if(mineField[x-1][y-1]) ++n; }

    if(x + 1 < FIELD_WIDTH) { if(mineField[x+1][y-1]) ++n; }
  }

  if(x - 1 >= 0) { if(mineField[x-1][y]) ++n; }

  if(x + 1 < FIELD_WIDTH) { if(mineField[x+1][y]) ++n; }

  if(y + 1 < FIELD_HEIGHT) {
    if(mineField[x][y+1]) ++n;

    if(x - 1 >= 0) { if(mineField[x-1][y+1]) ++n; }

    if(x + 1 < FIELD_WIDTH) { if(mineField[x+1][y+1]) ++n; }
  }

  return n;
}

var openCells = function(field, mineField, x, y) {
  if(field[x][y] === null && mineField[x][y] !== true) {
    field[x][y] = countMines(field, x, y);

    if(field[x][y] === 0) {
      if(y - 1 >= 0) {
        openCells(field, mineField, x, y-1);
        if(x - 1 >= 0) { openCells(field, mineField, x-1, y-1); }
        if(x + 1 < FIELD_WIDTH) { openCells(field, mineField, x+1, y-1); }
      }

      if(x - 1 >= 0) { openCells(field, mineField, x-1, y); }
      if(x + 1 < FIELD_WIDTH) { openCells(field, mineField, x+1, y); }

      if(y + 1 < FIELD_HEIGHT) {
        openCells(field, mineField, x, y+1);
        if(x - 1 >= 0) { openCells(field, mineField, x-1, y+1); }
        if(x + 1 < FIELD_WIDTH) { openCells(field, mineField, x+1, y+1); }
      }
    }
  }
};

var userCount = 0;

io.sockets.on('connection', function(socket) {
  ++userCount;

  socket.emit('field push', field);

  socket.broadcast.emit('count push', userCount);
  socket.emit('count push', userCount);

  socket.on('reset send', function() {
    setRandomMineField(mineField, 10);
    initializeField(field);
    io.sockets.emit('field push', field);
    io.sockets.emit('msg push', '');
  });

  socket.on('disconnect', function() {
    --userCount;
    socket.broadcast.emit('count push', userCount);
  });

  socket.on('pos send', function(pos) {
    if(mineField[pos[0]][pos[1]]) {
      field[pos[0]][pos[1]] = 'BOMB';
      socket.emit('msg push', '地雷踏みやがったm9(^Д^)ﾌﾟｷﾞｬｰ');
      socket.broadcast.emit('msg push', 'だれかが地雷を踏みました');
    } else {
      openCells(field, mineField, pos[0], pos[1]);
    }
    socket.emit('field push', field);
    socket.broadcast.emit('field push', field);
  });
});

