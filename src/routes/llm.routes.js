import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { llmRateLimit } from '../middleware/rateLimit.js';
import { complete } from '../controllers/llm.controller.js';

const router = Router();

router.post('/complete', authenticate, llmRateLimit, complete);

export default router;
