import { io, type Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getLabSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}
