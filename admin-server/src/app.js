import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import { authRouter } from './routes/auth.routes.js';
import { customerAuthRouter } from './routes/customerAuth.routes.js';
import { adminUsersRouter } from './routes/adminUsers.routes.js';
import { enquiryRouter } from './routes/enquiry.routes.js';
import { interactionRouter } from './routes/interaction.routes.js';
import { followupRouter } from './routes/followup.routes.js';
import { companyRouter } from './routes/company.routes.js';
import { applicationRouter } from './routes/application.routes.js';
import { auditLogRouter } from './routes/auditLog.routes.js';
import { notificationRouter } from './routes/notification.routes.js';

export const app = express();

app.use(helmet());
// Two origins, not one — this backend serves both the admin portal (:5174) and the marketing
// site's public contact form (:5173), unlike wellness-app's single-origin CORS config.
app.use(cors({ origin: env.clientOrigins, credentials: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(cookieParser());
// Unlike wellness-app (on-demand fetching via React Query), this backend's admin frontend polls
// every 8s per open widget (useLiveQuery, replacing Supabase Realtime — see admin/src/hooks/
// useLiveQuery.ts) across however many tabs/pages are open. A handful of open pages easily
// produces 100+ req/min, so the shared per-IP budget needs to be sized for continuous polling,
// not just occasional requests. Login attempts get their own, much stricter limiter (see
// auth.routes.js / customerAuth.routes.js) so this generous general limit doesn't weaken brute
// force protection.
app.use(rateLimit({ windowMs: 5 * 60 * 1000, limit: 3000, standardHeaders: true, legacyHeaders: false }));

// company-logos is a deliberately public bucket (matches the original Supabase storage.sql
// policy: public select, admin-only write) — plain static serving is correct here.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/customer-auth', customerAuthRouter);
app.use('/api/admin-users', adminUsersRouter);
app.use('/api/enquiries', enquiryRouter);
app.use('/api/interactions', interactionRouter);
app.use('/api/followups', followupRouter);
app.use('/api/companies', companyRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/notifications', notificationRouter);

app.use(notFoundHandler);
app.use(errorHandler);
