import { verifyAccessToken } from '../lib/jwt.js';

// Derives req.user solely from a verified JWT — request bodies/query strings can never
// set who the caller is or what role they have.
export function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing access token' });

    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired access token' });
    }
}

// Same as authenticate, but doesn't fail the request if there's no/invalid token —
// used for endpoints that behave differently for logged-in vs anonymous users.
export function optionalAuthenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {
        // ignore invalid token — treat as anonymous
    }
    next();
}
