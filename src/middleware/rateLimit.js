import rateLimit from 'express-rate-limit';

// Auth endpoints: guard against credential stuffing / brute force.
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later.' },
});

// LLM-backed endpoints cost real money per call — cap per authenticated user.
export const llmRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'Too many AI requests, please slow down.' },
});
