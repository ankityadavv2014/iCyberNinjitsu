export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  workspaceId?: string;
  userId?: string;
  jobId?: string;
  draftId?: string;
  scheduleJobId?: string;
  error?: string;
  durationMs?: number;
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const out: LogEntry = { ...entry, timestamp: new Date().toISOString() };
  console.log(JSON.stringify(out));
}
