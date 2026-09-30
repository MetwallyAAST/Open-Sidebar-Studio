# Verification — 1 October 2026

## Final result

- `npm run typecheck`: passed, strict TypeScript.
- `npm run lint`: passed without warnings.
- `npm test`: 10 tests passed.
- `npm run build`: passed with Next.js 16.3.8.
- `npm run test:e2e`: all 5 browser tests passed against the production server, using Chrome and the real PostgreSQL 18 database (21 seconds in the final run).
- `npm audit`: zero reported vulnerabilities, including development dependencies.
- Parent application's `npm run build`: passed with its existing vinext stack.
- PostgreSQL migrations, Prisma generation and idempotent seed: passed.
- Isolated database restart script: verified after stopping the original startup helper.

## Coverage

Domain tests validate reference/Operations presets, unsafe URL and CSS rejection, unsupported schema versions, cycles/orphans, width bounds, role and ancestor filtering, audience restrictions, exact/prefix/glob routes, active ancestors, reorder/reparent/duplicate operations, non-exponential wildcard matching, salted password verification, dynamic icon fallback and generated theme tokens.

Browser tests cover:

1. Pointer dragging of menu items and sections, with persisted database ordering assertions.
2. Expanded/collapsed rendering, the sidebar's actual collapse control, live label and width edits, preset application, moving nested items to root, mobile drawer opening/Escape dismissal, mobile viewport overflow and browser runtime errors.
3. Draft persistence after reload, unchanged published state before publication, stale-write rejection, publication, unsafe import validation, revision restoration and semantic audit events.
4. Anonymous and ordinary-user rejection from administration, cross-origin write rejection, protection of the reference preset and prevention of user-role escalation.
5. UI item creation, Save Draft, keyboard reordering with an explicit persisted-order assertion, Publish Changes, JSON export and invalid/valid file imports.

Mutation tests restore the prior sidebar. Test accounts are deleted by their exact generated IDs. Earlier disabled test accounts were cleaned up; the administrator account remains intact. Test audit/revision entries remain as genuine history.

## Visual comparison

All 164 video frames were extracted into contact sheets for inspection, including every frame of the collapse/expand sequence. Source sheets remain in the parent workspace's `.openai/sidebar-reference` directory.

The implementation was compared again after the final production build. The 260:76 expanded/collapsed width ratio, approximately 785 px expanded panel height, full-width red active row, row rhythm, three sections, footer placement, header dots, profile/search hierarchy and compact icon alignment follow the reference's approximately 174:51 px panel dimensions at video scale. Collapse preserves icon alignment and supports reduced-motion preferences.

Screenshots:

- [Desktop editor](screenshots/studio-desktop.png)
- [Mobile editor](screenshots/studio-mobile.png)
- [Open drawer](screenshots/mobile-drawer.png)

The folded grayscale background is an original SVG approximation. The avatar is a neutral placeholder. Exact source font metrics, wallpaper, blur values and animation curves cannot be recovered from the compressed video; the relevant tokens are configurable. This is not a pixel-identical reproduction or a formal WCAG certification. The supplied video does not show the administration UI or nested navigation, so those surfaces are purpose-built extensions.

## Scope and deployment limits

The separate application is implemented and runs locally at `http://127.0.0.1:3100`. No external deployment was requested or performed. HTTPS hosting, production database backups, reverse-proxy rate limits, SSO/MFA and mail delivery are not provisioned. Deployment setup is documented in the README.

The runtime `/app/*` surface demonstrates the published sidebar. It does not implement unrelated business applications behind Products, Orders or Messages. Badge providers read per-user database values; a host application is responsible for updating those values or connecting its authorized business queries.

Existing parent application source is unchanged. Two parent configuration exclusions prevent its TypeScript and ESLint checks from scanning the separate `sidebar-builder` project. No other existing projects were edited.

Headroom's compression tool was discovered and used, but its configured local proxy reported unreachable. RTK was used for shell commands. Exact source files and diagnostic output remained authoritative.
