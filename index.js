var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server, { wsEngine: 'ws' });
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

  socket.on('disconnect', (reason) => {
    io.sockets.emit('disconnect', reason);
    rooms = rooms.map(r => r.room === socket.room ? {...r, connections:r.connections.filter(c => c !== socket.name)} : r);
    socket.room && io.sockets.to(socket.room).emit('get connections', rooms.find(r => r.room === socket.room).connections);
    io.sockets.to('lobby').emit('get rooms', rooms);
  });

  socket.on('add song', (song) => {
    room = rooms.find(r => r.room === socket.room);
    if(room){
      room.playlist.push(song);
      io.sockets.to('lobby').emit('get room playlist', socket.room, room.playlist);
      io.sockets.to(room.room).emit('get playlist', room.playlist);
      console.log('add song');
    }
  });
// disconnected transport close
  socket.on('join room', (room) => {
    socket.leave('lobby', () => {
      socket.join(room, () => {
        socket.room = room;
        rooms = rooms.map(r => r.room === room ? {...r, connections:[...r.connections, socket.name].filter((a,i,s) => s.indexOf(a) === i)} : r);
        thisRoom = rooms.find(r => r.room === room);
        if(thisRoom){
          io.sockets.to(room).emit('get connections', thisRoom.connections);
          socket.emit('get playlist', thisRoom.playlist);
          io.sockets.to('lobby').emit('get room connections', room, thisRoom.connections);
        }
        console.log('join room', rooms.map(r => r.connections));
      });
    });
  });

  socket.on('exit room', (room) => {
    if(rooms.map(r => r.room).includes(room)){
      socket.leave(room, () => {
        socket.join('lobby', () => {
          socket.room = null;
          rooms = rooms.map(r => r.room === room ? {...r, connections:r.connections.filter(c => c !== socket.name)} : r);
          socket.emit('get rooms', rooms);
          io.sockets.in(room).emit('get connections', rooms.find(r => r.room === room).connections);
          io.sockets.to('lobby').emit('get room connections', room, rooms.find(r => r.room === room).connections);
          console.log('exit room', rooms.map(r => r.connections));
        });
      });
    }
  });

  socket.on('create room', (room) => {
    socket.leave('lobby', () => {
      socket.join(room, () => {
        socket.room = room;
        rooms.push({
          room,
          playlist:[],
          connections:[socket.name]
        });
        io.sockets.to('lobby').emit('get rooms', rooms);
        io.sockets.to(room).emit('get connections', rooms.find(r => r.room === room).connections);
        console.log('create room', rooms.map(r => r.connections));
      });
    });
  });

  socket.on('sort songs', (list) => {
    room = rooms.find(r => r.room === socket.room);
    if(room){
      room.playlist = list;
      io.sockets.to(room.room).emit('get playlist', room.playlist);
    }
  });

  socket.on('delete song', (songId) => {
    room = rooms.find(r => r.room === socket.room);
    if(room){
      room.playlist.splice(room.playlist.findIndex(pl => pl.id === songId), 1);
      io.sockets.to('lobby').emit('get room playlist', socket.room, room.playlist);
      io.sockets.to(room.room).emit('get playlist', room.playlist);
    }
  });

});