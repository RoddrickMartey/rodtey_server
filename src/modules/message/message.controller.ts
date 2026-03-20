import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';

// ─── Get conversation history ────────────────────────────
export const getConversation = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { receiverId } = req.params as { receiverId: string };
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 200;
  const skip = (page - 1) * limit;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId },
        { senderId: receiverId, receiverId: userId },
      ],
    },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      read: true,
      createdAt: true,
      senderId: true,
      receiverId: true,
    },
  });

  res.json({ success: true, data: messages.reverse() });
};

// ─── Get all conversations ───────────────────────────────
export const getConversations = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      content: true,
      read: true,
      createdAt: true,
      senderId: true,
      receiverId: true,
      sender: {
        select: { id: true, name: true, avatar: { select: { url: true } } },
      },
      receiver: {
        select: { id: true, name: true, avatar: { select: { url: true } } },
      },
    },
  });

  const conversationMap = new Map<string, (typeof messages)[0]>();
  for (const message of messages) {
    const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
    if (!conversationMap.has(partnerId)) {
      conversationMap.set(partnerId, message);
    }
  }

  res.json({ success: true, data: Array.from(conversationMap.values()) });
};

// ─── Get unread count ────────────────────────────────────
export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const count = await prisma.message.count({
    where: { receiverId: userId, read: false },
  });

  res.json({ success: true, data: { count } });
};
