import { env } from './config/env.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from './lib/passport.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import profilesRoutes from './routes/profiles.routes.js';
import contentTablesRoutes from './routes/contentTables.routes.js';
import userTablesRoutes from './routes/userTables.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import llmRoutes from './routes/llm.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';

export const app = express();

// Vercel puts one proxy hop in front of the function and sets X-Forwarded-For — trusting
// exactly that one hop lets express-rate-limit (and req.ip generally) see the real client
// IP instead of every request collapsing onto Vercel's edge IP and sharing one rate-limit
// bucket. Not needed locally, where there's no proxy in front of the dev server.
if (env.isProd) app.set('trust proxy', 1);

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api', contentTablesRoutes);
app.use('/api', userTablesRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/uploads', uploadsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
