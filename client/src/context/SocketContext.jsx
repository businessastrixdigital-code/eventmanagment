import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, role } = useAuth();

  useEffect(() => {
    // Connect to the Socket.io server
    // Since Vite server proxies /socket.io, we can connect directly to the current host
    const newSocket = io({
      autoConnect: true,
      reconnection: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected to real-time server with ID:', newSocket.id);
      
      // Re-join room if already authenticated
      if (role === 'couple' && user?.id) {
        newSocket.emit('join-couple-room', user.id);
      } else if (role === 'superadmin') {
        newSocket.emit('join-superadmin-room');
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('[SOCKET] Connection error:', err.message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Join appropriate room when auth state changes
  useEffect(() => {
    if (!socket || !socket.connected) return;

    if (role === 'couple' && user?.id) {
      socket.emit('join-couple-room', user.id);
    } else if (role === 'superadmin') {
      socket.emit('join-superadmin-room');
    }
  }, [socket, user, role]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
