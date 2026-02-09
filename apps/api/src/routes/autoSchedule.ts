import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

const DEFAULTS = {
  enabled: false,
  postsPerDay: 1,
  preferredTimes: ['09:00'],
  timezone: 'America/New_York',
  daysOfWeek: [1, 2, 3, 4, 5],
};

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows } = await query<{
    id: string;
    workspace_id: string;
    enabled: boolean;
    posts_per_day: number;
    preferred_times: string[];
    timezone: string;
    days_of_week: number[];
    updated_at: Date;
  }>(
    'SELECT id, workspace_id, enabled, posts_per_day, preferred_times, timezone, days_of_week, updated_at FROM auto_schedule_settings WHERE workspace_id = $1',
    [wId]
  );
  if (rows.length === 0) {
    res.json({ ...DEFAULTS, workspaceId: wId });
    return;
  }
  const r = rows[0];
  res.json({
    id: r.id,
    workspaceId: r.workspace_id,
    enabled: r.enabled,
    postsPerDay: r.posts_per_day,
    preferredTimes: r.preferred_times,
    timezone: r.timezone,
    daysOfWeek: r.days_of_week,
    updatedAt: r.updated_at,
  });
}));

router.put('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const {
    enabled,
    posts_per_day,
    preferred_times,
    timezone,
    days_of_week,
  } = req.body ?? {};

  const e = typeof enabled === 'boolean' ? enabled : DEFAULTS.enabled;
  const ppd = typeof posts_per_day === 'number' && posts_per_day >= 1 && posts_per_day <= 10 ? posts_per_day : DEFAULTS.postsPerDay;
  const pt = Array.isArray(preferred_times) && preferred_times.length > 0 ? preferred_times : DEFAULTS.preferredTimes;
  const tz = typeof timezone === 'string' && timezone.length > 0 ? timezone : DEFAULTS.timezone;
  const dow = Array.isArray(days_of_week) && days_of_week.length > 0 ? days_of_week : DEFAULTS.daysOfWeek;

  const { rows } = await query<{
    id: string;
    workspace_id: string;
    enabled: boolean;
    posts_per_day: number;
    preferred_times: string[];
    timezone: string;
    days_of_week: number[];
    updated_at: Date;
  }>(
    `INSERT INTO auto_schedule_settings (workspace_id, enabled, posts_per_day, preferred_times, timezone, days_of_week, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (workspace_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       posts_per_day = EXCLUDED.posts_per_day,
       preferred_times = EXCLUDED.preferred_times,
       timezone = EXCLUDED.timezone,
       days_of_week = EXCLUDED.days_of_week,
       updated_at = now()
     RETURNING id, workspace_id, enabled, posts_per_day, preferred_times, timezone, days_of_week, updated_at`,
    [wId, e, ppd, pt, tz, dow]
  );
  const r = rows[0];
  res.json({
    id: r.id,
    workspaceId: r.workspace_id,
    enabled: r.enabled,
    postsPerDay: r.posts_per_day,
    preferredTimes: r.preferred_times,
    timezone: r.timezone,
    daysOfWeek: r.days_of_week,
    updatedAt: r.updated_at,
  });
}));
