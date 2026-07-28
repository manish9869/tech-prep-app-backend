import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { uploadImage, uploadResume as uploadResumeMiddleware } from '../middleware/upload.js';
import * as uploadsController from '../controllers/uploads.controller.js';

const router = Router();

router.post('/topic-logo', authenticate, requireAdmin, uploadImage, uploadsController.uploadTopicLogo);
router.post('/resume', authenticate, uploadResumeMiddleware, uploadsController.uploadResume);

export default router;
