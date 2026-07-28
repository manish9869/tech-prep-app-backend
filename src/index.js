import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port} (${env.nodeEnv})`);
    if (!env.googleOAuthEnabled) {
        console.log('Google OAuth is not configured (GOOGLE_CLIENT_ID/SECRET missing) — /api/auth/google will 503.');
    }
});
