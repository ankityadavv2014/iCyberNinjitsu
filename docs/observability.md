# Observability

## Log schema (structured JSON)

Fields: `timestamp`, `level`, `message`, `requestId?`, `workspaceId?`, `userId?`, `jobId?`, `draftId?`, `scheduleJobId?`, `error?`, `durationMs?`. No secrets.

## Metrics (Prometheus-style)

- `astra_ingest_runs_total` (counter) labels: workspace_id, status
- `astra_trend_items_ranked_total` (counter) labels: workspace_id
- `astra_drafts_created_total` (counter) labels: workspace_id
- `astra_drafts_approved_total` (counter) labels: workspace_id
- `astra_scheduled_total` (counter) labels: workspace_id
- `astra_publish_success_total` (counter) labels: workspace_id
- `astra_publish_failure_total` (counter) labels: workspace_id, reason
- `astra_rate_limit_hits_total` (counter) labels: workspace_id
- `astra_queue_depth` (gauge) labels: queue
- `astra_credential_valid` (gauge) labels: workspace_id

## Alerts

| Condition | Action |
|-----------|--------|
| astra_publish_failure_total rate > 5 in 15m | Notify (email/slack) |
| astra_credential_valid == 0 for workspace | Notify + dashboard banner |
| astra_rate_limit_hits_total > 0 in 5m | Notify |
| kill switch engaged | Log + dashboard banner |
