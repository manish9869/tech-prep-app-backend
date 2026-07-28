import { z } from 'zod';
import { invokeGroq } from '../lib/groq.js';

// One generic, authenticated, rate-limited proxy for every LLM feature in the app
// (resume analysis/optimization, mock-interview feedback, code run/analyze/optimize/
// generate-challenge). The prompt TEMPLATES aren't secret — they're just instructions,
// not credentials — so there's no security reason to duplicate six near-identical prompt
// builders server-side. What actually mattered (and is now fixed) is that the Groq API
// key never reaches the browser, and every call requires a logged-in, rate-limited user.
const completeSchema = z.object({
    prompt: z.string().min(1).max(20000),
    parseJSON: z.boolean().optional().default(false),
    maxTokens: z.number().int().min(1).max(8000).optional().default(1024),
});

export async function complete(req, res, next) {
    try {
        const parsed = completeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { prompt, parseJSON, maxTokens } = parsed.data;
        const result = await invokeGroq({ prompt, parseJSON, maxTokens });
        res.json({ result });
    } catch (err) {
        next(err);
    }
}
