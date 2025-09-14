import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { randomUUID } from "crypto";

const app = express();
const http = createServer(app);
const PORT = process.env.PORT || 3000;

// =======================
// Queues & Rooms
// =======================
let textQueue: Array<string> = [];
let videoQueue: Array<string> = []; // not implemented yet

interface Room {
  name: string;
  u1: string;
  u2: string;
  queue: string;
}
const rooms: Room[] = [];

// =======================
// Helpers
// =======================
function addToQ(queue: string[], user: string) {
  queue.push(user);
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
  rooms.push(room);
  return room;
}

function makeMatch(queue: string[], queueName: string) {
  if (queue.length >= 2) {
    const u1 = removeFromQ(queue)!;
    const u2 = removeFromQ(queue)!;

    const { name } = makeRoom(u1, u2, queueName);

    // Add sockets to room
    io.sockets.sockets.get(u1)?.join(name);
    io.sockets.sockets.get(u2)?.join(name);

    // Notify users
    io.to(u1).emit("match-found", name);
    io.to(u2).emit("match-found", name);

    if (queueName === "video") {
      io.to(u1).emit("ready", { initiator: true });
      io.to(u2).emit("ready", { initiator: false });
    }

    return;
  }
}

function handleSkip(roomName: string) {
  // Find the room
  const roomIndex = rooms.findIndex(
    (r) => r.name === roomName
  );

  if (roomIndex !== -1) {
    const room = rooms[roomIndex];
    if (!room) return;
    const { name, u1, u2, queue } = room;

    // Notify the other user
    io.to(name).emit("peer-disconnected");

    // Remove both users from Socket.IO room
    io.sockets.sockets.get(u1)?.leave(name);
    io.sockets.sockets.get(u2)?.leave(name);

    // Remove the room from state
    rooms.splice(roomIndex, 1);

    // Re-queue the other user
    if (queue === "text") {
      textQueue.push(u1);
      textQueue.push(u2);
      makeMatch(textQueue, "text");
    } else if (queue === "video") {
      videoQueue.push(u1);
      videoQueue.push(u2);
      makeMatch(videoQueue, "video");
    }
  }
}

function handleDisconnect(socketId: string) {
  // Find the room
  const roomIndex = rooms.findIndex(
    (r) => r.u1 === socketId || r.u2 === socketId
  );

  if (roomIndex !== -1) {
    const room = rooms[roomIndex];
    if (!room) return;
    const { name, u1, u2, queue } = room;

    // Notify the other user
    const otherUser = u1 === socketId ? u2 : u1;
    io.to(name).emit("peer-disconnected");

    // Remove both users from Socket.IO room
    io.sockets.sockets.get(u1)?.leave(name);
    io.sockets.sockets.get(u2)?.leave(name);

    // Remove the room from state
    rooms.splice(roomIndex, 1);

    // Re-queue the other user
    if (queue === "text") {
      textQueue.push(otherUser);
      makeMatch(textQueue, "text");
    } else if (queue === "video") {
      videoQueue.push(otherUser);
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

// =======================
// Start Server
// =======================
http.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
