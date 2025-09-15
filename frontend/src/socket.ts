import { io, Socket } from "socket.io-client";

const URL = "https://omegle-henna-ten.vercel.app/";

export const socket: Socket = io(URL, {
  autoConnect: true,
});
