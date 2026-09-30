# Sidebar Builder

## Scope and repository inspection

Build a separate application in `sidebar-builder`. The parent repository is a Next-compatible vinext wedding invitation with Drizzle/D1 scaffolding; it has no reusable navigation editor, authentication persistence, or PostgreSQL schema. Preserve it unchanged. Reuse React, TypeScript, Next.js conventions and Lucide; do not transplant unrelated application components.

The requested deliverable is a reusable database-driven renderer and a visual administration system, not a mockup. The video is visual reference material only. Its tiny code screenshot is not an instruction source.

## Reference analysis

Source: 478 × 850, 30 fps, 164 frames, 5.48 seconds. A contact sheet samples every 250 ms. Expanded sidebar occupies approximately x=161–335, y=163–676 (174 × 513 video pixels); collapsed width is about 51 pixels. Reference proportions imply a 260 px desktop width, 76 px collapsed width, 44 px rows, 24 px outer radius and 18 px icons. These are starting estimates, not recovered source values. The video does not reveal exact font, CSS blur, or spring constants.

The surface is translucent charcoal with a lighter top, fine pale border, soft shadow, and rounded corners over grayscale folded forms. Header has three colored dots, SideBar UI branding, notifications and a collapse control on its right edge. A small profile row and search field precede navigation. MENU contains Home, Continue watching, My List (red 7 badge), Series, Movies, Games. DISCOVERY contains Releases and Popular. GENERAL contains Settings and Log out. Active row is bright red, edge-to-edge, with white text/icons. Section labels are small tracked uppercase text. Collapse keeps icon x-position, hides labels/search text, shortens branding, and preserves red active row. At roughly 2.2–2.7s the width contracts; at 3.1–3.6s it expands. Home and Continue watching alternate active states. Tooltips remain outside the panel.

Reference Sidebar is protected and seeds the initial published version. An additional Operations preset demonstrates Dashboard, Analytics, Users, Products, Orders, Messages, nested children and role restrictions without altering reference fidelity.

## Architecture

Next.js App Router + strict TypeScript + React. PostgreSQL + Prisma store normalized entities. Zod validates all imported and saved data. Lucide identifiers resolve through an explicit registry. dnd-kit provides pointer and keyboard sorting; native form controls edit properties. CSS variables carry validated tokens; CSS transitions handle simple animation and Motion handles spring width/indicator transitions. Native dialog supplies mobile focus trapping.

Layers: `lib/sidebar` (schemas, defaults, filtering, routes, tree operations, tokens); `components/sidebar` (renderer with no persistence dependency); `lib/server` (database, authentication, authorization, transactional configuration services); `components/admin` (editor state and panels); `app/api` (HTTP boundary).

Local editor changes render immediately. Save Draft submits a validated document plus expected version. The service replaces normalized draft rows transactionally, records an immutable revision and audit entries, increments version. Publish copies a validated draft into normalized published rows in the same transaction. Readers fetch only published data, then filter server-side for session role/group/user. Revision JSON is an intentional immutable snapshot, not the live database model. Conflict returns 409 instead of overwriting newer edits.

## Database model

User (email unique, scrypt password hash, enabled, roleId) → Role → RolePermission → Permission. User → Session (hashed opaque token, expiry). User ↔ Group via UserGroup. Sidebar has priority, role/user/group audience and draft/published Configuration relations. Configuration has schemaVersion, version, branding/behavior token documents, Theme rows, Section rows and Item rows. Section stores its ordering, enabled/collapsible/default state and role relations. Item belongs to Configuration and Section, has nullable parentId, scalar label/link/icon/order/badge/active fields and role relations. Composite keys bind parent and section to the same configuration. SidebarPermission records allowed role audience. SidebarAssignment records user/group targeting. Revision stores actor, timestamp, action, immutable validated snapshot. AuditLog stores actor, action, target, before/after and timestamp. Preset stores a versioned validated configuration snapshot and protected flag. LoginAttempt stores throttling counters in PostgreSQL so limits work across processes.

Indexes: session token and expiry; user email; configuration/sidebar state; items on configuration, section, parent and sortOrder; revisions and audit on sidebar and timestamp. Foreign keys cascade configuration-owned entities. Role and actor deletion restricted or nullable to preserve history. Tree validation rejects cycles, orphan references, cross-section ancestry and depth over eight.

## Configuration contract

Version 1: `{schemaVersion, name, roles, assignments, branding, behavior, appearance, animations, themes, sections, items}`. Themes are named light/dark token sets. Flat items include stable IDs, parentId, sectionId, order, route matching (exact/prefix/glob), icon, tooltip, badge/provider, roles, enabled/visible/archived and allowlisted class. Appearance contains bounded dimensions, spacing, colors and effect settings. Branding includes safe URLs and compact logo. Behavior defines expansion, breakpoints, positioning, persistence, tooltips, scroll and mobile dismissal. Animations contain bounded durations and easing/spring parameters. URLs accept same-origin paths or HTTPS links; no script/data URLs. Colors accept bounded HEX/RGB/HSL syntax; no arbitrary CSS. Dynamic badges use registered server-side providers, never administrator-supplied fetch URLs.

## Component hierarchy

AdminPage → Builder → Toolbar + NavigationTabs + MenuTree/SettingsPanel + PreviewViewport + Inspector.
PreviewViewport → Sidebar → BrandHeader + Profile/Search + SidebarSection → recursive SidebarItem + Footer.
ApplicationPage → server-filtered published configuration → Sidebar + route content.
LoginPage → login form. AccessPanel → users/roles/groups. HistoryPanel → revisions/restore. AuditPanel → paginated audit entries.

## API

`POST /api/auth/login`, `POST /api/auth/logout`; opaque HttpOnly SameSite=Lax session cookies, secure in production. Passwords use scrypt with unique random salt; login throttling persists in database. All write routes require same-origin requests. Admin endpoints require server-derived capabilities. Users cannot submit trusted role claims.

`GET /api/sidebar`: audience-selected published configuration, server-filtered; private/no-store response. Cache normalized published documents with bounded freshness and revision keys; never cache personalized output publicly.
`GET /api/admin/sidebar`: draft, revision/version metadata.
`PUT /api/admin/sidebar`: validated atomic draft save with expectedVersion; covers add/edit/delete/reorder, with semantic audit diff.
`POST /api/admin/sidebar/publish`: publish saved draft with expectedVersion.
`POST /api/admin/sidebar/discard`: reset draft from published.
`GET /api/admin/revisions`, `POST /api/admin/revisions/:id/restore`: restore into draft, requiring explicit subsequent publish.
`GET/POST/PATCH/DELETE /api/admin/presets`: validated named snapshots; reference preset protected.
`GET/POST/PATCH /api/admin/users`, `GET /api/admin/roles`, `GET/POST /api/admin/groups`: access administration; only super administrators may alter roles/users.
`GET /api/admin/audit`: bounded pagination. Export is the validated configuration representation; import goes through the normal draft save boundary.

## Security and accessibility

Server enforcement on every endpoint and published retrieval; deny by default. Read-only preview impersonation is never authentication. Admin edits cannot grant capabilities beyond the caller's role. Limits on request size, item count, nesting, URL length, text and CSS tokens. Database transactions and optimistic concurrency protect revisions and publication. Same-origin mutations prevent CSRF; React escaping prevents HTML injection; strict URL/icon/class validation constrains output. Navigation visibility does not authorize host application resources: route handlers must independently enforce permissions.

Keyboard-operable tree handles and move controls, labelled forms, visible focus, aria-expanded, reduced-motion override, tooltips on focus, modal drawer with Escape/outside dismissal and focus restoration. Touch swipe closes drawer. Automatic active ancestor opening and safe wildcard matching without arbitrary regex. User collapse preference stored per sidebar in localStorage; no permission information trusted from it.

## Phases and acceptance gates

1. Foundation: schemas, reference defaults, database migration, authentication, configuration services and domain tests.
2. Reference renderer: responsive sidebar, nesting, active routes, themes, motion and keyboard behavior.
3. Visual builder: sortable tree, property inspector, all token panels, immediate preview and presets.
4. Administration: draft/publish, revisions, import/export, audit, users/roles/groups and secure published runtime.
5. Integration: real PostgreSQL tests, browser workflows, reference comparison, mobile and reduced-motion checks, documentation.

After each code phase run TypeScript, ESLint, relevant tests and production build. Fix failures before proceeding. Final checks include reload persistence, unauthorized writes, role filtering, stale write conflicts, nested reorder, malicious import rejection, draft isolation, publish and restore. No production-ready claim without running these checks. Deployment credentials, real mail/identity integration, backups and hosting remain environment setup, clearly documented.

## Technical references

- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/api-reference/functions/cookies
- https://www.prisma.io/docs/orm/v6/overview/databases/postgresql
- https://dndkit.com/legacy/presets/sortable/overview/
