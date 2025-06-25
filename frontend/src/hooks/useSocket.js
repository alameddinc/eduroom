import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Singleton socket instance
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socketInstance.on('connect', () => {
      console.log('Connected to server');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
    });
  }
  return socketInstance;
}

function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketConnection = getSocket();
    setSocket(socketConnection);

    // Don't close the socket on unmount, keep it alive
    return () => {
      // Only close if this is the last component using the socket
      // In a real app, you might want to implement reference counting
    };
  }, []);

  return socket;
}

export default useSocket;