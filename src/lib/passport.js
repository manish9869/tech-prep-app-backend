import crypto from 'node:crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

if (env.googleOAuthEnabled) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: env.googleClientId,
                clientSecret: env.googleClientSecret,
                callbackURL: env.googleCallbackUrl,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value?.toLowerCase();
                    const fullName = profile.displayName || null;
                    const googleId = profile.id;

                    if (!email) return done(new Error('Google account has no email'));

                    const byGoogleId = await pool.query('SELECT * FROM profiles WHERE google_id = $1', [
                        googleId,
                    ]);
                    if (byGoogleId.rows[0]) return done(null, byGoogleId.rows[0]);

                    const byEmail = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
                    if (byEmail.rows[0]) {
                        // Existing email/password account signing in with Google for the first time — link it.
                        const { rows } = await pool.query(
                            'UPDATE profiles SET google_id = $1, email_verified = true WHERE id = $2 RETURNING *',
                            [googleId, byEmail.rows[0].id]
                        );
                        return done(null, rows[0]);
                    }

                    const role = env.adminBootstrapEmails.includes(email) ? 'admin' : 'user';
                    const { rows } = await pool.query(
                        `INSERT INTO profiles (id, email, full_name, google_id, role, email_verified)
                         VALUES ($1, $2, $3, $4, $5, true)
                         RETURNING *`,
                        [crypto.randomUUID(), email, fullName, googleId, role]
                    );
                    return done(null, rows[0]);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );
}

export default passport;
