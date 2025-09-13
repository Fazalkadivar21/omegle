import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import { io, Socket } from "socket.io-client";

const Chat = () => {
  const localStreamRef = useRef<HTMLDivElement | null>(null);
  const remoteStreamRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:3000");
    const socket = socketRef.current;

    // Join video chat queue
    socket.emit("vc");

    // Waiting event
    socket.on("waiting", (text: string) => {
      console.log(text);
    });

    // Match found
    socket.on("match-found", (roomName: string) => {
      currentRoomRef.current = roomName;
    });

    // Peer disconnected
    socket.on("peer-disconnected", () => {
      currentRoomRef.current = null;
      socket.emit("tc");
      window.location.reload();
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("waiting");
      socket.off("match-found");
      socket.off("peer-disconnected");
      socket.disconnect();
    };
  }, []);

  const handleSkip = () => {
    socketRef.current?.emit("skip");
    currentRoomRef.current = null;
    socketRef.current?.emit("vc");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black text-[beige]">
        <NavLink
          to="/"
          className="hover:underline"
          onClick={() => {
            if (socketRef.current) {
              socketRef.current.disconnect();
            }
          }}
        >
          Back
        </NavLink>

        <button
          onClick={handleSkip}
          className="px-4 py-1 bg-[beige] text-black border border-black rounded hover:bg-black hover:text-[beige] transition"
        >
          Skip
        </button>
      </div>
      <div>
        <div ref={localStreamRef}></div>
        <div ref={remoteStreamRef}></div>
      </div>
    </div>
  );
};

export default Chat;
