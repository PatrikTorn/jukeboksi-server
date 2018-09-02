var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var cors = require('cors');
app.use(cors);
server.listen(process.env.PORT || 5000);
// WARNING: app.listen(80) will NOT work here!

connections = [];
playlist = [];

io.on('connection', (socket) => {

  socket.emit('get playlist', playlist);
  io.sockets.emit('get connections', connections.length);
  connections.push(socket);
  console.log('connected', connections.length);

  socket.on('disconnect', () => {
    connections.splice(connections.indexOf(socket));
    console.log('disconnected', connections.length);
  });

  socket.on('add song', (song) => {
    playlist.push(song);
    io.sockets.emit('get playlist', playlist);
  });

  socket.on('sort songs', (list) => {
    playlist = list;
    io.sockets.emit('get playlist', playlist);
  });

  socket.on('delete song', (songId) => {
    playlist.splice(playlist.findIndex(pl => pl.id === songId), 1);
    io.sockets.emit('get playlist', playlist);
  });

});
