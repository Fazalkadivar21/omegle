import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import { io, Socket } from "socket.io-client";

const VideoChat = () => {
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<string | null>(null);

  const [connected, setConnected] = useState(false);
  const [waitingMsg, setWaitingMsg] = useState<string | null>(
    "Finding a stranger..."
  );
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    socketRef.current = io("http://localhost:3000");
    const socket = socketRef.current;

    socket.emit("vc"); // join video queue

  // Ask browser for permissions up front
  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      // Don’t connect yet — just prepare stream
    } catch (err) {
      console.error("Permission denied or error:", err);
      alert("Please allow camera and microphone access to continue.");
    }
  };

  getMedia();

    socket.on("waiting", (msg: string) => {
      setWaitingMsg(msg || "Finding a stranger...");
      setConnected(false);
    });

    socket.on("match-found", (room: string) => {
      roomRef.current = room;
      setWaitingMsg(null);
    });

    socket.on("ready", async ({ initiator }) => {
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = peer;

      // ICE
      peer.onicecandidate = (event) => {
        if (event.candidate && roomRef.current) {
          socket.emit("ice", roomRef.current, event.candidate);
        }
      };

      // Remote stream
      peer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      } catch (err) {
        console.error("Media error:", err);
      }

      // Initiator sends offer
      if (initiator && roomRef.current) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", roomRef.current, offer);
      }
    });

    socket.on("offer", async (offer) => {
      if (!peerRef.current || !roomRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit("answer", roomRef.current, answer);
    });

    socket.on("answer", async (answer) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setConnected(true);
    });

    socket.on("ice-candidate", async (candidate) => {
      if (!peerRef.current) return;
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE error:", err);
      }
    });

    socket.on("peer-disconnected", () => {
      setConnected(false);
      setWaitingMsg("Finding a a match for you...");
      roomRef.current = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      socket.emit("vc");
    });

    return () => {
      socket.disconnect();
      peerRef.current?.close();
    };
  }, []);

  const handleSkip = () => {
    socketRef.current?.emit("skip",{room : roomRef.current});
    setWaitingMsg("Finding a match for you...");
    setConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    roomRef.current = null;
  };

  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => (track.enabled = muted));
    setMuted((m) => !m);
  };

  const toggleCamera = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => (track.enabled = cameraOff));
    setCameraOff((c) => !c);
  };

  return (
    <div className="flex flex-col h-screen bg-[beige] text-black">
      {/* Header */}
        {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black text-[beige]">
        <NavLink
          to="/"
          className="hover:underline"
          onClick={() => socketRef.current?.disconnect()}
        >
          Back
        </NavLink>
        <span className="font-semibold">
          {waitingMsg
            ? waitingMsg
            : connected
            ? "Connected with a stranger"
            : "Preparing..."}
        </span>
        <button
          onClick={handleSkip}
          className="px-3 py-1 bg-[beige] text-black border border-black rounded hover:bg-black hover:text-[beige] transition"
        >
          Skip
        </button>
      </div>

      {/* Video Area */}
      <div className="relative flex-1 flex items-center justify-center bg-black">
        {/* Remote video fills screen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-[80vh] object-contain"
        />

        {/* Local video as small preview (bottom-right corner) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 w-28 h-40 md:w-40 md:h-52 rounded-lg border-2 border-[beige] object-cover bg-gray-800"
        />
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-6 p-4 bg-[beige] border-t border-black">
        <button
          onClick={toggleMute}
          className="px-4 py-2 rounded-full border border-black bg-black text-[beige] hover:bg-[beige] hover:text-black transition"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={toggleCamera}
          className="px-4 py-2 rounded-full border border-black bg-black text-[beige] hover:bg-[beige] hover:text-black transition"
        >
          {cameraOff ? "Camera On" : "Camera Off"}
        </button>
      </div>
    </div>
  );
};

export default VideoChat;
