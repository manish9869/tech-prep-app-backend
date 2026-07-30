import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { uploadImage, uploadResume as uploadResumeMiddleware } from '../middleware/upload.js';
import * as uploadsController from '../controllers/uploads.controller.js';

const router = Router();

/**
 * @openapi
 * /uploads/topic-logo:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a topic logo image (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: object, properties: { file_url: { type: string } } } } } }
 *       400: { description: No file provided, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/topic-logo', authenticate, requireAdmin, uploadImage, uploadsController.uploadTopicLogo);

/**
 * @openapi
 * /uploads/resume:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a resume (PDF/DOCX/TXT) and extract its text
 *     description: Extracted text (first 8000 chars) is returned for the client to feed into `/llm/complete` for analysis — it is not itself the AI call.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 file_url: { type: string }
 *                 file_name: { type: string }
 *                 extracted_text: { type: string }
 *       400: { description: No file provided, or no readable text could be extracted, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/resume', authenticate, uploadResumeMiddleware, uploadsController.uploadResume);

export default router;
