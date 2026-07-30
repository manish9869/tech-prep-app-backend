import { Router } from 'express';
import passport from '../lib/passport.js';
import { env } from '../config/env.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/authenticate.js';
import { issueSession } from '../lib/authSession.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account
 *     description: Rate-limited. Also sets an httpOnly refresh-token cookie for silent session refresh.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               full_name: { type: string, maxLength: 120 }
 *     responses:
 *       201:
 *         description: Account created and session issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: Email already registered, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/register', authRateLimit, authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email + password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Session issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Invalid credentials, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/login', authRateLimit, authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange the httpOnly refresh cookie for a new access token
 *     description: Rotates the refresh token (reuse of an already-rotated token revokes every session for that user).
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Missing, invalid, expired, or revoked refresh token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/refresh', authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current refresh token and clear the session cookie
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { success: { type: boolean } } }
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link
 *     description: Always returns the same message whether or not the email exists, to avoid leaking registered emails.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Generic confirmation message (includes `devResetLink` outside production)
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { message: { type: string }, devResetLink: { type: string } } }
 */
router.post('/forgot-password', authRateLimit, authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password using a reset token
 *     description: Revokes every active session for the account on success, forcing re-login everywhere.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { success: { type: boolean } } }
 *       400: { description: Invalid or expired reset link, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/reset-password', authRateLimit, authController.resetPassword);

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Start Google OAuth sign-in
 *     description: Browser-redirect flow, not meant to be called via fetch/XHR. Redirects to `{FRONTEND_URL}/oauth-complete?token=...` on success. Returns 503 if Google OAuth isn't configured on the server.
 *     security: []
 *     responses:
 *       302: { description: Redirects to Google's consent screen }
 *       503: { description: Google OAuth not configured, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
if (env.googleOAuthEnabled) {
    router.get(
        '/google',
        passport.authenticate('google', { scope: ['profile', 'email'], session: false })
    );

    router.get('/google/callback', (req, res, next) => {
        // Not using passport's `failureRedirect` option here — it silently redirects on any
        // auth failure without logging anything, which makes failures like a bad client
        // secret or a mismatched redirect_uri invisible. This custom callback logs the real
        // reason server-side and surfaces a short version in the redirect query string too.
        passport.authenticate('google', { session: false }, async (err, user, info) => {
            if (err) {
                console.error('[google oauth] strategy error:', err);
                return res.redirect(
                    `${env.frontendUrl}/login?error=google&reason=${encodeURIComponent(err.message || 'strategy_error')}`
                );
            }
            if (!user) {
                const reason = info?.message || req.query.error_description || req.query.error || 'unknown';
                console.error('[google oauth] authentication failed:', { info, query: req.query });
                return res.redirect(`${env.frontendUrl}/login?error=google&reason=${encodeURIComponent(reason)}`);
            }
            try {
                // Also sets the httpOnly refresh cookie for future silent refreshes, but the
                // frontend and backend are on different vercel.app subdomains — browsers that
                // block third-party cookies (increasingly the default) will drop that cookie
                // when OAuthComplete tries to send it back cross-site via fetch. Passing the
                // access token straight through the redirect means completing login never
                // depends on that cookie actually surviving the trip.
                const accessToken = await issueSession(res, user);
                res.redirect(`${env.frontendUrl}/oauth-complete?token=${encodeURIComponent(accessToken)}`);
            } catch (sessionErr) {
                console.error('[google oauth] issueSession failed:', sessionErr);
                next(sessionErr);
            }
        })(req, res, next);
    });
} else {
    router.get('/google', (req, res) => {
        res.status(503).json({ error: 'Google OAuth is not configured on the server' });
    });
}

export default router;
