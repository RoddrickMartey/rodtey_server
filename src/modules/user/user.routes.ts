import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserById,
} from './user.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/me', getProfile);
router.patch('/me', updateProfile);
router.patch('/me/password', changePassword);
router.delete('/me', deleteAccount);
router.get('/:id', getUserById);

export default router;
