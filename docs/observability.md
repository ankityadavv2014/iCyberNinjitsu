# Observability

## Log schema (structured JSON)

Fields: `timestamp`, `level`, `message`, `requestId?`, `workspaceId?`, `userId?`, `jobId?`, `draftId?`, `scheduleJobId?`, `error?`, `durationMs?`. No secrets.

## Metrics (Prometheus-style)

- `icn_ingest_runs_total` (counter) labels: workspace_id, status
- `icn_trend_items_ranked_total` (counter) labels: workspace_id
- `icn_drafts_created_total` (counter) labels: workspace_id
- `icn_drafts_approved_total` (counter) labels: workspace_id
- `icn_scheduled_total` (counter) labels: workspace_id
- `icn_publish_success_total` (counter) labels: workspace_id
- `icn_publish_failure_total` (counter) labels: workspace_id, reason
- `icn_rate_limit_hits_total` (counter) labels: workspace_id
- `icn_queue_depth` (gauge) labels: queue
- `icn_credential_valid` (gauge) labels: workspace_id

## Alerts

| Condition | Action |
|-----------|--------|
| icn_publish_failure_total rate > 5 in 15m | Notify (email/slack) |
| icn_credential_valid == 0 for workspace | Notify + dashboard banner |
| icn_rate_limit_hits_total > 0 in 5m | Notify |
| kill switch engaged | Log + dashboard banner |
