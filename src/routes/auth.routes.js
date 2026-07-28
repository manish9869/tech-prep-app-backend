import { Router } from 'express';
import passport from '../lib/passport.js';
import { env } from '../config/env.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/authenticate.js';
import { issueSession } from '../lib/authSession.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authRateLimit, authController.forgotPassword);
router.post('/reset-password', authRateLimit, authController.resetPassword);

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
