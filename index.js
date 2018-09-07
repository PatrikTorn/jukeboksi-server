var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var cors = require('cors');
var fs = require('file-system');
var uuid = require('uuid/v1');
app.use(cors);
server.listen(process.env.PORT || 5000);

connections = [];
rooms = [];

io.on('connection', (socket) => {
  socket.name = uuid();
  socket.join('lobby');
  socket.emit('get rooms', rooms);

  socket.on('disconnect', () => {
    rooms = rooms.map(r => r.room === socket.room ? {...r, connections:r.connections.filter(c => c !== socket.name)} : r);
    socket.room && io.sockets.in(socket.room).emit('get connections', rooms.find(r => r.room === socket.room).connections);
    console.log('disconnected', rooms.map(r => r.connections));
    io.sockets.in('lobby').emit('get rooms', rooms);
  });

  socket.on('add song', (song) => {
    room = rooms.find(r => r.room === socket.room);
    room.playlist.push(song);
    io.sockets.in(room.room).emit('get playlist', room.playlist);
    io.sockets.emit('get rooms', rooms);
    console.log(rooms);
  });

  socket.on('join room', (room) => {
    socket.leave('lobby');
    socket.join(room);
    socket.room = room;
    rooms = rooms.map(r => r.room === room ? {...r, connections:[...r.connections, socket.name].filter((a,i,s) => s.indexOf(a) === i)} : r);
    io.sockets.in(room).emit('get connections', rooms.find(r => r.room === room).connections);
    socket.emit('get playlist', rooms.find(r => r.room === room).playlist);
    io.sockets.in('lobby').emit('get rooms', rooms);
    console.log('join room', rooms.map(r => r.connections));
  });

  socket.on('exit room', (room) => {
    socket.leave(room);
    socket.room = null;
    rooms = rooms.map(r => r.room === room ? {...r, connections:r.connections.filter(c => c !== socket.name)} : r);
    io.sockets.in(room).emit('get connections', rooms.find(r => r.room === room).connections);
    io.sockets.in('lobby').emit('get rooms', rooms);
    console.log(rooms.map(r => r.connections));
  });

  socket.on('create room', (room) => {
    socket.leave('lobby');
    socket.join(room);
    socket.room = room;
    rooms.push({
      room,
      playlist:[],
      connections:[socket.name]
    });
    // io.sockets.in(room).emit('get connections', rooms.find(r => r.room === room).connections);
    io.sockets.in('lobby').emit('get rooms', rooms);
    // socket.emit('join room', room);
    io.sockets.in(room).emit('get connections', rooms.find(r => r.room === room).connections);
    console.log('create room', rooms.map(r => r.connections));
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
