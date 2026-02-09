# Tenant isolation (workspace_id)

All data is scoped by workspace. Every API route that accesses workspace data must:

1. **Resolve workspace from URL:** Use `requireWorkspaceMember` or `requireWorkspaceOwner` so `req.workspaceId` is set from `req.params.workspaceId` (or `req.params.id` on the workspaces router).

2. **Include workspace_id in every query:** All `SELECT`/`UPDATE`/`DELETE`/`INSERT` that touch workspace-scoped tables must either:
   - Include `workspace_id = $n` in the WHERE clause (or equivalent), or
   - Join through a table that is already scoped by workspace_id (e.g. draft_posts → workspace_id).

3. **No cross-workspace reads:** Never query by id alone; always include workspace_id so users cannot access another workspace’s data by guessing IDs.

4. **New tables:** Any new table that holds tenant data must have a `workspace_id` column (or a FK to a workspace-scoped entity).

## Owner-only routes

- `DELETE /workspaces/:id` — delete workspace
- `GET|PUT /workspaces/:workspaceId/provider-config` — app credentials (e.g. LinkedIn client id/secret)

All other workspace routes use `requireWorkspaceMember` so any member (owner, admin, editor, viewer) can access them. Role-based restrictions (e.g. editor vs viewer) can be added later with `requireEditor` or `requireAdmin` middleware.
