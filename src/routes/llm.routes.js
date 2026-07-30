import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { llmRateLimit } from '../middleware/rateLimit.js';
import { complete } from '../controllers/llm.controller.js';

const router = Router();

/**
 * @openapi
 * /llm/complete:
 *   post:
 *     tags: [AI]
 *     summary: Generic authenticated, rate-limited proxy to the Groq LLM
 *     description: >
 *       Backs every AI feature in the app: Mock Interview answer feedback, Resume Analyzer
 *       (scoring, keyword matching, optimized rewrite), and the Code Editor's run/analyze/
 *       optimize/generate-challenge actions. The prompt template is built client-side and sent
 *       here — the Groq API key itself never reaches the browser, and every call requires a
 *       logged-in, rate-limited user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string, maxLength: 20000 }
 *               parseJSON: { type: boolean, default: false, description: Parse the model's response as JSON before returning it. }
 *               maxTokens: { type: integer, minimum: 1, maximum: 8000, default: 1024 }
 *     responses:
 *       200:
 *         description: Model output (string, or parsed JSON when `parseJSON` is true)
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { result: {} } }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Rate limit exceeded, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/complete', authenticate, llmRateLimit, complete);

export default router;
