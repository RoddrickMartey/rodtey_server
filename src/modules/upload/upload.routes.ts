import { Router } from 'express';
import { uploadSingleImage, uploadMultipleImages, deleteSingleImage } from './upload.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { uploadLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.post('/single', authenticate, uploadLimiter, uploadSingleImage);
router.post('/multiple', authenticate, uploadLimiter, uploadMultipleImages);
router.delete('/:id', authenticate, deleteSingleImage);

export default router;
