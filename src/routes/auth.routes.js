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

    router.get(
        '/google/callback',
        passport.authenticate('google', { session: false, failureRedirect: `${env.frontendUrl}/login?error=google` }),
        async (req, res, next) => {
            try {
                await issueSession(res, req.user);
                res.redirect(`${env.frontendUrl}/oauth-complete`);
            } catch (err) {
                next(err);
            }
        }
    );
} else {
    router.get('/google', (req, res) => {
        res.status(503).json({ error: 'Google OAuth is not configured on the server' });
    });
}

export default router;
