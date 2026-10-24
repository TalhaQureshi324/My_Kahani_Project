# Internal Marketing API — n8n Contract (v1)

The stable interface between n8n workflows and the True Self Me CMS.
n8n NEVER touches Supabase tables directly; everything goes through
this authenticated, validated, audited API.

- **Base URL (production):** `https://trueselfme.com/api/internal/marketing`
- **Base URL (local dev):** `http://localhost:3000/api/internal/marketing`
- **Authentication:** every request carries `Authorization: Bearer <MARKETING_API_KEY>`
- **Content type:** `application/json`
- **Rate limit:** 120 requests/min/IP → `429 RATE_LIMITED`
- **CORS:** none (server-to-server only; no browser clients)

## Response envelope

```json
// success
{ "success": true, "data": { ... }, "requestId": "<uuid>" }
// failure
{ "success": false, "error": { "code": "SLUG_CONFLICT", "message": "..." }, "requestId": "<uuid>" }
```

Every response includes the `X-Request-Id` header. Optional headers
`X-TSM-Workflow` / payload `workflowName` label audit events (never
used for authentication).

## Status model (enforced at API + DB trigger layers)

```
draft → generated → review → approved → scheduled → published → archived
                    ↘ rejected/failed → draft
published → draft (unpublish)
```

**Automation may set statuses:** `review`, `draft`, `failed` only.
**Approval** (`review → approved`) and all publication-state changes
are administrator actions through `/admin` (AUTO_APPROVE is false).

## Endpoints

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/health` | DB + CMS reachability | authenticated |
| GET | `/content` | compact registry (no bodies) | filters: `status`, `pillar`, `publishedSince`, `search`, `limit` |
| GET | `/blogs` | compact list | `status`, `limit` |
| POST | `/blogs` | create GENERATED draft | idempotent on `automationJobId` |
| GET | `/blogs/:id` | full article | 404 if unknown |
| PATCH | `/blogs/:id` | update draft | only `generated`/`review`; 409 otherwise |
| POST | `/blogs/:id/status` | `{status}` | automation statuses only; 403/422 otherwise |
| POST | `/blogs/:id/schedule` | `{scheduledAt: ISO}` | requires APPROVED; blocked in test mode |
| POST | `/blogs/:id/publish` | publish | APPROVED/SCHEDULED only; revalidates caches; idempotent |
| POST | `/blogs/:id/unpublish` | `{reason?}` | PUBLISHED → DRAFT; page 404s afterwards |
| POST | `/blogs/:id/archive` | archive | PUBLISHED → ARCHIVED; history kept |
| GET | `/calendar` | planned slots | `from`, `to`, `limit` (YYYY-MM-DD) |
| POST | `/calendar` | create slot | unique per date+platform+contentType (409) |
| PATCH | `/calendar/:id` | edit slot | status/date/topic/pillar/blogId |
| GET | `/settings` | safe settings | read-only whitelist |
| GET | `/context` | brand context + recent articles | no client data |
| POST | `/revalidate` | `{slug?}` | manual cache revalidation |

## Create blog — POST `/blogs`

Request:
```json
{
  "automationJobId": "TSM-2026-10-24-BLOG-001",
  "workflowName": "TSM-02-Blog-Generator",
  "title": "How to Communicate Without Becoming Defensive",
  "slug": "how-to-communicate-without-becoming-defensive",
  "excerpt": "Defensiveness is a signal...",
  "content": "## Why we get defensive\n\nMarkdown body…",
  "featuredImage": "https://…",
  "featuredImageAlt": "…",
  "contentPillar": "Relationships & Communication",
  "primaryKeyword": "communicate without defensiveness",
  "secondaryKeywords": ["active listening"],
  "searchIntent": "informational",
  "contentCluster": "Healthy Communication",
  "metaTitle": "…", "metaDescription": "…",
  "canonicalUrl": "https://trueselfme.com/blog/…",
  "ogTitle": "…", "ogDescription": "…", "ogImage": "https://…",
  "sourceReferences": [{ "title": "…", "url": "https://…" }],
  "internalLinks": [{ "url": "https://trueselfme.com/blog/…", "anchorText": "…" }],
  "generationModel": "glm-5.3-flash",
  "promptVersion": "blog-writer-v1"
}
```

Response `201 Created`:
```json
{ "success": true, "data": { "article": { "id": "…", "status": "generated", "…": "…" },
  "reviewUrl": "/admin/blogs/<id>" }, "requestId": "…" }
```

**Idempotency:** the first request creates the article (`201`). A retry
with the same `automationJobId` returns the existing article with `200`
and `"idempotent": true` — never a duplicate (unique DB index backs
this even under concurrent races). `SLUG_CONFLICT` (409) is returned
when a *different* job tries an already-used slug — n8n should choose
a new slug; the API never silently renames.

**Sanitization:** stored content passes a dangerous-markdown strip at
ingest AND the render-time allowlist sanitizer. Status is always
forced to `generated` regardless of payload.

## Publish — POST `/blogs/:id/publish`

Requires APPROVED or SCHEDULED. Validates title/slug/content exist,
stores `publishedAt`, revalidates `/blog`, `/blog/[slug]`,
`/sitemap.xml` (no rebuild), records `BLOG_PUBLISHED` +
`REVALIDATION_COMPLETED` audit events, and returns:

```json
{ "success": true, "data": { "id": "…", "status": "published",
  "url": "https://trueselfme.com/blog/<slug>", "slug": "<slug>",
  "publishedAt": "…" }, "requestId": "…" }
```

Idempotent: republishing returns `200` with the same URL. After
publish, TSM-07 should verify externally: `GET <url>` → HTTP 200.

## Test mode

Set `MARKETING_AUTOMATION_TEST_MODE=true` to refuse all publication
state changes (`403 TEST_MODE_BLOCKED`) while everything else works —
integration tests can create drafts and exercise validation without
ever publishing.

## Error codes

`AUTH_REQUIRED` 401 · `API_DISABLED` 503 · `RATE_LIMITED` 429 ·
`VALIDATION_ERROR` 400 · `NOT_FOUND` 404 · `SLUG_CONFLICT` 409 ·
`CALENDAR_CONFLICT` 409 · `EDIT_NOT_ALLOWED` 409 · `INVALID_STATUS` 422 ·
`INVALID_TRANSITION` 422 · `PUBLISH_VALIDATION` 422 ·
`STATUS_NOT_ALLOWED` 403 · `TEST_MODE_BLOCKED` 403 ·
`DATABASE_ERROR` 500 · `REVALIDATION_FAILED` 500

## Testing

`scripts/marketing-api-check.mjs` runs the safe end-to-end suite
against `BASE_URL` with `$MARKETING_API_KEY` (read from env, never
hardcoded). It creates a fixture draft, exercises idempotency,
conflicts, validation, and confirms publish is correctly refused for
non-approved content. Full publish-flow rehearsal: approve the fixture
in `/admin/blogs/<id>` (admin action), re-run with `--with-publish`.
