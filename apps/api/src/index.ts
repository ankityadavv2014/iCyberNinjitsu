import express from 'express';
import cors from 'cors';
import { getMetrics } from './lib/metrics.js';
import { router as workspacesRouter } from './routes/workspaces.js';
import { router as credentialsRouter, handleLinkedInCallback } from './routes/credentials.js';
import { router as sourcesRouter } from './routes/sources.js';
import { router as topicsRouter } from './routes/topics.js';
import { router as topicBundlesRouter } from './routes/topicBundles.js';
import { router as trendsRouter } from './routes/trends.js';
import { router as draftsRouter } from './routes/drafts.js';
import { router as scheduleRouter } from './routes/schedule.js';
import { router as approvedPostsRouter } from './routes/approvedPosts.js';
import { router as attemptsRouter } from './routes/attempts.js';
import { router as controlRouter } from './routes/control.js';
import { router as templatesRouter } from './routes/templates.js';
import { router as policiesRouter } from './routes/policies.js';
import { router as auditRouter } from './routes/audit.js';
import { router as autoScheduleRouter } from './routes/autoSchedule.js';
import { router as providerConfigRouter } from './routes/providerConfig.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/metrics', (_req, res) => res.setHeader('Content-Type', 'text/plain').send(getMetrics()));

app.use('/workspaces', workspacesRouter);
app.use('/workspaces/:workspaceId/credentials', credentialsRouter);
app.use('/workspaces/:workspaceId/sources', sourcesRouter);
app.use('/workspaces/:workspaceId/topics', topicsRouter);
app.use('/workspaces/:workspaceId/topic-bundles', topicBundlesRouter);
app.use('/workspaces/:workspaceId/trends', trendsRouter);
app.use('/workspaces/:workspaceId/drafts', draftsRouter);
app.use('/workspaces/:workspaceId/schedule', scheduleRouter);
app.use('/workspaces/:workspaceId/approved-posts', approvedPostsRouter);
app.use('/workspaces/:workspaceId/attempts', attemptsRouter);
app.use('/workspaces/:workspaceId', controlRouter);
app.use('/workspaces/:workspaceId/templates', templatesRouter);
app.use('/workspaces/:workspaceId/policies', policiesRouter);
app.use('/workspaces/:workspaceId/audit', auditRouter);
app.use('/workspaces/:workspaceId/auto-schedule', autoScheduleRouter);
app.use('/workspaces/:workspaceId/provider-config', providerConfigRouter);
app.get('/oauth/linkedin/callback', (req, res) => handleLinkedInCallback(req, res));

// Global error handler -- catches all errors forwarded by asyncHandler
app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.stack ?? err.message ?? err);
  if (!res.headersSent) {
    res.status(err.status ?? 500).json({ code: 'INTERNAL', message: err.message ?? 'Internal server error' });
  }
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
