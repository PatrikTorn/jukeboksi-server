var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var cors = require('cors');
var fs = require('file-system');
app.use(cors);
server.listen(process.env.PORT || 5000);

connections = [];
rooms = [];

io.on('connection', (socket) => {
  socket.emit('get rooms', rooms);
  //io.sockets.emit('get connections', connections.length);


  socket.on('disconnect', () => {
    connections.splice(connections.findIndex(c => c.socket === socket), 1);
    // io.sockets.emit('get rooms', rooms.map(room => ({...room, connections: room.room === socket.room ? connections.filter(c => c.room === socket.room).length : room.connections})));
    io.sockets.in(socket.room).emit('get connections', connections.filter(c => c.room === socket.room).length);
    console.log('disconnected', connections.length);
  });

  socket.on('add song', (song) => {
    room = rooms.find(r => r.room === socket.room);
    room.playlist.push(song);
    io.sockets.in(room.room).emit('get playlist', room.playlist);
    console.log(rooms);
  });

  socket.on('join room', (room) => {
    socket.join(room);
    socket.room = room;
    connections.push({socket, room});
    io.sockets.in(room).emit('get connections', connections.filter(c => c.room === room).length);
    // socket.emit('join room', room);
    socket.emit('get playlist', rooms.find(r => r.room === room).playlist);
    console.log('join room and get playlist');
  });

  socket.on('exit room', (room) => {
    socket.leave(room);
    socket.room = null;
    connections.splice(connections.findIndex(c => c.socket === socket), 1);
    io.sockets.in(room).emit('get connections', connections.filter(c => c.room === room).length);
    // socket.emit('exit room');
    // socket.emit('get playlist', []);
  });

  socket.on('create room', (room) => {
    socket.join(room);
    socket.room = room;
    rooms.push({
      room,
      playlist:[]
    });
    connections.push({socket, room});
    io.sockets.in(room).emit('get connections', connections.filter(c => c.room === room).length);
    io.sockets.emit('get rooms', rooms);
    socket.emit('join room', room);
    console.log('connected', connections.filter(c => c.room === room).length);
    console.log('create room', rooms);
  });

  socket.on('sort songs', (list) => {
    room = rooms.find(r => r.room === socket.room);
    room.playlist = list;
    io.sockets.in(room.room).emit('get playlist', room.playlist);
  });

  socket.on('delete song', (songId) => {
    room = rooms.find(r => r.room === socket.room);
    room.playlist.splice(room.playlist.findIndex(pl => pl.id === songId), 1);
    io.sockets.in(room.room).emit('get playlist', room.playlist);
  });

});
