import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token.js';
import prisma from '../config/prisma.js';

let io: SocketServer;

export const initSocket = (server: HttpServer): void => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // ─── Auth middleware ───────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) return next(new Error('No token provided'));

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;

    console.info(`✦ Socket connected: ${userId}`);

    // ─── Join personal room ────────────────────────────
    // every user joins their own room so we can send
    // them targeted notifications
    void socket.join(`user:${userId}`);

    // ─── Join conversation room ────────────────────────
    socket.on('join:conversation', (receiverId: string) => {
      const roomId = getRoomId(userId, receiverId);
      void socket.join(roomId);
    });

    // ─── Leave conversation room ───────────────────────
    socket.on('leave:conversation', (receiverId: string) => {
      const roomId = getRoomId(userId, receiverId);
      void socket.leave(roomId);
    });

    // ─── Send message ──────────────────────────────────
    socket.on('message:send', async (data: { receiverId: string; content: string }) => {
      const { receiverId, content } = data;

      if (!receiverId || !content?.trim()) return;

      // save to db
      const message = await prisma.message.create({
        data: {
          senderId: userId,
          receiverId,
          content: content.trim(),
        },
        select: {
          id: true,
          content: true,
          read: true,
          createdAt: true,
          senderId: true,
          receiverId: true,
        },
      });

      const roomId = getRoomId(userId, receiverId);

      // send to everyone in the conversation room
      io.to(roomId).emit('message:receive', message);

      // send notification to receiver's personal room
      // in case they are not in the conversation
      io.to(`user:${receiverId}`).emit('notification:message', {
        senderId: userId,
        messageId: message.id,
        content: message.content,
        createdAt: message.createdAt,
      });
    });

    // ─── Mark messages as read ─────────────────────────
    socket.on('message:read', async (senderId: string) => {
      await prisma.message.updateMany({
        where: {
          senderId,
          receiverId: userId,
          read: false,
        },
        data: { read: true },
      });

      // notify sender their messages were read
      io.to(`user:${senderId}`).emit('message:seen', { by: userId });
    });

    // ─── Disconnect ────────────────────────────────────
    socket.on('disconnect', () => {
      console.info(`✦ Socket disconnected: ${userId}`);
    });
  });
};

// ─── Emit to specific user from anywhere ────────────────
export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

// ─── Consistent room id for two users ───────────────────
// sort ids so roomId is the same regardless of who initiates
const getRoomId = (userA: string, userB: string): string => [userA, userB].sort().join(':');
