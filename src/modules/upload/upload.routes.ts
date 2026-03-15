import { Router } from 'express';
import { uploadSingleImage, uploadMultipleImages, deleteSingleImage } from './upload.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.post('/single', authenticate, uploadSingleImage);
router.post('/multiple', authenticate, uploadMultipleImages);
router.delete('/:id', authenticate, deleteSingleImage);

export default router;
