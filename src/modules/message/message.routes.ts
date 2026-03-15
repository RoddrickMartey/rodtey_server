import { Router } from 'express';
import { getConversation, getConversations, getUnreadCount } from './message.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.get('/', authenticate, getConversations);
router.get('/unread', authenticate, getUnreadCount);
router.get('/:receiverId', authenticate, getConversation);

export default router;
