# Open Sidebar Studio

A standalone Next.js application with a reusable sidebar renderer, PostgreSQL-backed visual editor, server-side role filtering, and a draft/publish workflow.

## Run locally

Requires Node.js 22.13+ and PostgreSQL. Copy `.env.example` to `.env`, replace all placeholder passwords, and set `DATABASE_URL`. Start the supplied database with `docker compose up -d`, or use an existing PostgreSQL database, before running migrations.

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://127.0.0.1:3100. Local credentials are in the ignored `LOCAL_ACCESS.md`; regenerate that file with `node scripts/access.mjs`. The seed script requires a 16-character minimum password in `.env` and never overwrites existing passwords or configurations.

To restart this isolated Windows database, run `powershell -NoProfile -File scripts/local-postgres.ps1`. It requires PostgreSQL 18 in its standard installation directory. It does not change another database cluster or install a Windows service.

For another machine, copy `.env.example` to `.env`, replace all passwords, set `DATABASE_URL`, and either use an existing PostgreSQL database or run `docker compose up -d`. `APP_ORIGIN` must exactly match the browser origin, including port; use HTTPS in deployment. It controls CSRF checks and secure cookies.

## Workflows

- **Menu builder:** select an item, edit properties on the right, drag using the grip. Drag onto a “Nest inside” target to reparent or a section root target to unnest. Keyboard users can pick up a grip with Space, move with arrows, and drop with Space; the parent/section selectors and Move up/down controls offer explicit alternatives.
- **Appearance, Animations, Behavior, Themes, Branding:** changes immediately update the center preview. Invalid values show a validation message and prevent saving. Every token has a reset control. Dark and light appearance tokens are separate; Behavior selects the theme mode.
- **Save draft:** persists normalized rows, creates a revision, and records semantic changes in the audit log. Published navigation is unchanged.
- **Publish changes:** saves pending edits, then publishes the validated draft. Other users receive the new configuration on their next page/API request without a rebuild. Concurrent edits return 409; reload before retrying.
- **History:** preview an old configuration or restore it into draft. Publication is always a separate action.
- **Presets:** apply Reference Sidebar or Operations, save a new preset, rename, duplicate, or delete custom presets. Reference Sidebar is protected. “Reset to reference” replaces the local draft; save/publish explicitly.
- **More actions:** export a versioned JSON backup, import a validated backup into preview, discard the draft, or add an audience-specific sidebar variant. Import never automatically publishes.
- **Users & roles:** super administrators create users, assign predefined roles, enable/disable accounts, reset passwords and manage group membership. Password and role changes revoke sessions. Users and groups have copyable IDs for sidebar audience assignments.
- **Permissions:** sidebar audience restrictions combine with section/item restrictions. Empty roles mean everyone; nonempty roles are explicit allowlists. User/group assignments are ORed, then intersected with role permissions. Higher-priority published variants win. Child visibility never bypasses an inaccessible ancestor.
- **Developer:** opt-in inspection of configuration, CSS variables, menu tree, permission filtering and route activation. It is not the normal editing interface.

## Reuse

`lib/sidebar` owns schemas, defaults, tree/route/filter logic and tokens. `components/sidebar` consumes a validated, already-authorized configuration and has no Prisma dependency. Copy those directories into a host app or package them behind your own export boundary. Import `sidebar.css` and provide the current path and navigation callback.

The demo `/app/*` route is an example host surface, not a users/products/orders application. Sidebar visibility is not authorization for a business resource. Protect those routes and APIs independently with your application's permissions.

`lib/server/configuration.ts` owns persistence and server-side audience filtering. The normalized live tables are separate from immutable JSON revision/preset snapshots. Token groups are structured JSON because they form bounded versioned value objects; menu entities and permissions are relational.

Badge sources are registered server-side. `unread` and `pendingOrders` query per-user `BadgeValue` rows; static badges come from item configuration. The seed provides example counts for the initial administrator. A host application can update these rows or replace the provider functions with authorized business queries. Administrators cannot specify arbitrary server fetch URLs.

## Verification

```powershell
npm run check
npm run test:e2e
npm audit
```

`check` runs strict TypeScript, ESLint, domain/render-token tests, and a production build. Browser tests use installed Chrome and a real PostgreSQL database. They exercise authenticated UI editing, responsive preview, nesting, draft isolation, persistence, conflicts, publication, revision restore, audit entries, import/export, CSRF and role checks. They restore the original sidebar after mutation tests. Run against a development database, not live production data.

The browser suite can use a running development or production server at port 3100. Otherwise Playwright starts the development server. Screenshots and traces are in `test-results` and excluded from Git.

## Production operation

Use a managed PostgreSQL database or a backed-up persistent volume. Run `prisma migrate deploy` before starting the application. Set a unique administrator password and an HTTPS `APP_ORIGIN`; never deploy the local `.env` or `LOCAL_ACCESS.md`. Build with `npm run build`, serve with `npm start`, and place an HTTPS reverse proxy in front of port 3100. The provided start command binds to loopback. Adjust host binding only when your container/network setup requires it.

Sessions are opaque random tokens stored hashed in the database, expire after eight hours, and use HttpOnly/SameSite cookies. Passwords are salted scrypt hashes. Login attempts are rate-limited per account in PostgreSQL. Apply edge/IP rate limiting at the reverse proxy as well. This application includes local email/password authentication; SSO, password-reset email delivery, MFA, production monitoring and automated database backups are deployment integrations, not configured services.

Prisma's `deepmerge-ts` dependency is overridden to its patched 8.x release. Prisma generate, migration, seed and integration tests verify compatibility. The lockfile is authoritative.

## Reference fidelity

The source video is 478 × 850 at 30 fps. The default mirrors the dark translucent panel, full-width red selection, menu grouping, icon/label alignment, header/profile/search hierarchy and collapse proportions. Reference values were estimated from video pixels, not recovered from original source. The grayscale folds background is an original SVG approximation and the avatar is a neutral placeholder. They can be replaced with licensed source assets; logo/profile URLs are configurable. The reference never demonstrated nested menus or an admin screen, so those surfaces extend the observed design.

See `docs/architecture.md` for the architecture, schema decisions, API contract and phased plan; `docs/verification.md` records the final checks and remaining limits.
