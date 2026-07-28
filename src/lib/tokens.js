import crypto from 'node:crypto';

// Used for password-reset links. Same pattern as refresh tokens: random opaque value
// handed to the user, only its hash is ever persisted.
export function generateOpaqueToken(ttlMs) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + ttlMs);
    return { token, tokenHash, expiresAt };
}

export function hashOpaqueToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
