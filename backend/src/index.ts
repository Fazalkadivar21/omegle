import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { randomUUID } from "crypto";
import path from "path";

const app = express();
const http = createServer(app);
const PORT = process.env.PORT || 3000;

// =======================
// Queues & Rooms
// =======================
let textQueue: string[] = [];
let videoQueue: string[] = [];

interface Room {
  name: string;
  u1: string;
  u2: string;
  queue: string;
}
// Use a Map for O(1) lookup/removal
const rooms: Map<string, Room> = new Map();

// =======================
// Helpers
// =======================

function addToQ(queue: string[], user: string) {
  if (!queue.includes(user)) queue.push(user);
}

function removeFromQ(queue: string[]) {
  return queue.shift();
}


function removeUser(user: string) {
  textQueue = textQueue.filter((u) => u !== user);
  videoQueue = videoQueue.filter((u) => u !== user);
}


function makeRoom(u1: string, u2: string, queue: string) {
  const room: Room = { name: randomUUID(), u1, u2, queue };
  rooms.set(room.name, room);
  return room;
}


function makeMatch(queue: string[], queueName: string) {
  while (queue.length >= 2) {
    const u1 = removeFromQ(queue)!;
    const u2 = removeFromQ(queue)!;
    if (!u1 || !u2) break;
    const { name } = makeRoom(u1, u2, queueName);
    io.sockets.sockets.get(u1)?.join(name);
    io.sockets.sockets.get(u2)?.join(name);
    io.to(u1).emit("match-found", name);
    io.to(u2).emit("match-found", name);
    if (queueName === "video") {
      io.to(u1).emit("ready", { initiator: true });
      io.to(u2).emit("ready", { initiator: false });
    }
  }
}


function handleSkip(roomName: string) {
  const room = rooms.get(roomName);
  if (!room) return;
  const { name, u1, u2 } = room;
  io.to(name).emit("peer-disconnected");
  io.sockets.sockets.get(u1)?.leave(name);
  io.sockets.sockets.get(u2)?.leave(name);
  rooms.delete(roomName);
}


function handleDisconnect(socketId: string) {
  
  let foundRoom: Room | undefined;
  for (const room of rooms.values()) {
    if (room.u1 === socketId || room.u2 === socketId) {
      foundRoom = room;
      break;
    }
  }
  if (foundRoom) {
    const { name, u1, u2, queue } = foundRoom;
    const otherUser = u1 === socketId ? u2 : u1;
    io.to(name).emit("peer-disconnected");
    io.sockets.sockets.get(u1)?.leave(name);
    io.sockets.sockets.get(u2)?.leave(name);
    rooms.delete(name);
    if (queue === "text") {
      addToQ(textQueue, otherUser);
      makeMatch(textQueue, "text");
    } else if (queue === "video") {
      addToQ(videoQueue, otherUser);
      makeMatch(videoQueue, "video");
    }
  }
  removeUser(socketId);
}

// =======================
// Express Setup
// =======================
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(express.static(path.join(__dirname,"../public")))

// =======================
// Socket.IO Setup
// =======================

const io = new Server(http, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join text chat
  socket.on("tc", () => {
    addToQ(textQueue, socket.id);
    io.to(socket.id).emit("waiting", "Finding a match for you...");
    makeMatch(textQueue, "text");
  });

  // Messages
  socket.on("message", (data) => {
    if (!data || !data.room || !data.message) return;
    socket.to(data.room).emit("message", data.message);
  });

  // Typing
  socket.on("typing", (data) => {
    if (!data || !data.room) return;
    socket.to(data.room).emit("typing");
  });

  // Stop typing
  socket.on("stopTyping", (data) => {
    if (!data || !data.room) return;
    socket.to(data.room).emit("stopTyping");
  });

  //for the video chat
  socket.on("vc", () => {
    addToQ(videoQueue, socket.id);
    io.to(socket.id).emit("waiting", "Finding a match for you...");
    makeMatch(videoQueue, "video");
  });

  socket.on("offer", (room: string, offer: any) => {
    socket.to(room).emit("offer", offer);
  });

  socket.on("answer", (room: string, answer: any) => {
    socket.to(room).emit("answer", answer);
  });

  socket.on("ice", (room: string, candidate: any) => {
    socket.to(room).emit("ice-candidate", candidate);
  });

  socket.on("skip",(room:{room:string})=>{
    console.log(room.room);
    
    handleSkip(room.room)
  })

  // Actual disconnect
  socket.on("disconnect", () => {
    handleDisconnect(socket.id);
  });
});

// =======================
// Routes
// =======================
app.get("/", (req, res) => {
  res.send("One piece is real.");
});

app.get("*name",(req,res)=>{
  res.sendFile(path.join(__dirname,"../public/index.html"))
})

// =======================
// Start Server
// =======================
http.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
