import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  sender: "you" | "stranger" | "system";
  text: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  useEffect(() => {
    socketRef.current = io("https://omegle-henna-ten.vercel.app/");
    const socket = socketRef.current;

    // Join text chat queue
    socket.emit("tc");

    // Stranger messages
    socket.on("message", (data) => {
      setMessages((prev) => [...prev, { sender: "stranger", text: data }]);
    });

    // Typing events
    socket.on("typing", () => setIsTyping(true));
    socket.on("stopTyping", () => setIsTyping(false));

    // Waiting event
    socket.on("waiting", (text: string) => {
      setMessages((prev) => [...prev, { sender: "system", text }]);
    });

    // Match found
    socket.on("match-found", (roomName: string) => {
      currentRoomRef.current = roomName;

      // Remove all previous system messages (including waiting)
      setMessages((prev) => prev.filter((msg) => msg.sender !== "system"));

      // Add system message for match found
      setMessages((prev) => [
        ...prev,
        { sender: "system", text: "You are now connected with a stranger." },
      ]);
    });

    // Peer disconnected
    socket.on("peer-disconnected", () => {
      currentRoomRef.current = null;
      setMessages([{ sender: "system", text: "Finding a match for you..." }]);
      socket.emit("tc");
    });

    return () => {
      socket.off("message");
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("waiting");
      socket.off("match-found");
      socket.off("peer-disconnected");
      socket.disconnect();
    };
  }, []);

  const handleSkip = () => {
    socketRef.current?.emit("skip",{room : currentRoomRef.current});
    currentRoomRef.current = null;
    setMessages([
      {
        sender: "system",
        text: "You skipped the chat. Searching for a new stranger...",
      },
    ]);
  };

  const send = () => {
    if (!input.trim() || !currentRoomRef.current) return;
    setMessages((prev) => [...prev, { sender: "you", text: input }]);
    socketRef.current?.emit("message", {
      room: currentRoomRef.current,
      message: input,
    });
    socketRef.current?.emit("stopTyping", { room: currentRoomRef.current });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!socketRef.current || !currentRoomRef.current) return;

    socketRef.current.emit("typing", { room: currentRoomRef.current });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit("stopTyping", { room: currentRoomRef.current });
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-[beige] text-black">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-xs px-3 py-2 rounded-md border border-black ${
              msg.sender === "you"
                ? "ml-auto bg-black text-[beige] text-right"
                : msg.sender === "stranger"
                ? "mr-auto bg-[beige] text-black"
                : "mx-auto bg-gray-300 text-black italic"
            }`}
          >
            <span className="block font-semibold">{msg.sender}</span>
            <span>{msg.text}</span>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="mr-auto flex items-center gap-1 px-2 py-1">
            <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 flex items-center gap-2 border-t border-black bg-[beige]">
        <input
          type="text"
          value={input}
          placeholder="Type a message..."
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 border border-black rounded focus:outline-none"
        />
        <button
          onClick={send}
          className="px-4 py-2 bg-black text-[beige] rounded hover:bg-[beige] hover:text-black border border-black transition"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
