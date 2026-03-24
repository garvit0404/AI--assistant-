import { io } from "socket.io-client";

const SOCKET_URL = "http://127.0.0.1:3001";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
