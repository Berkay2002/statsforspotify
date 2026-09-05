# Maintenance audit, September 5, 2026

The local patch repairs confirmed authorization and history defects while retaining
the website's routes, layout, components, and account model. It is not ready to be
treated as a verified production release: actual Supabase Auth/PostgREST integration
and authenticated browser/Spotify checks remain outstanding. Native PostgreSQL
concurrency verification now passes without Docker.

Release preparation additionally restored an encrypted production backup into
native PostgreSQL and applied both pending migrations while preserving every
public/Auth table count. See the deployment record for scope and limitations.

The original audit was local only. The owner subsequently authorized a GitHub,
Vercel and production Supabase release. Release evidence is recorded in
[maintenance deployment](maintenance-deployment.md). No live export or deletion
function was invoked during the audit.

## Baseline and scope

Starting commit: `482cfd9933f9fac77d81fb9aab217791e78e17f7`. The checkout was clean.
Dependencies were installed from the existing lockfile using Bun 1.3.14.

| Check before behavior changes | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed, 740 packages installed |
| `bun run lint` | Passed |
| `tsc --noEmit --incremental false` | Passed |
| `bun run build` | Passed with Next.js 16.1.1 and placeholder public Supabase settings |
| Original schema validation | Failed: default Bash required unavailable WSL; Git Bash then exposed missing documentation |
| Automated unit, database, browser verification | No existing suite |

The source review covered OAuth and middleware, token storage and refresh, Spotify
requests and playback, both snapshot collectors, ranking/history queries, friend
requests and profile privacy, exports and deletion, schema functions/policies/grants,
and setup/schema-sync scripts. UI source changes were limited to affected behavior.
Desktop/mobile screenshots of the repaired public landing page are now captured
and reviewed. Comparison with the original commit and authenticated dashboard
visual preservation remain unverified.

The September 5 hosted metadata check confirmed that all three account/export
functions still used a nullable `auth.uid() != target_user_id` guard and were
executable by `anon`. It also confirmed anonymous TRUNCATE privilege on friendships.
Read-only preflight found zero ranking/snapshot ownership mismatches across all
three ranking tables and zero duplicate UTC-day groups. These are point-in-time
checks, not proof that the hosted application has or has not been exploited.

## Confirmed findings and dispositions

"SQL verified" below means the original schema was restored into PGlite, original
defects reproduced with synthetic data, both new migrations applied, and the SQL
regression suites passed. PGlite runs PostgreSQL but uses a small Auth schema/claim
shim. It does not establish Supabase Auth, PostgREST, or separate-session behavior.

### S01. Anonymous account deletion and export, critical

- Location/evidence: `delete_user_account`, `delete_user_data`, and
  `export_user_data` in the original schema. SQL NULL comparison bypassed the
  ownership guard; anonymous EXECUTE grants made the functions callable. Original
  exploit reproduction passed locally; hosted definitions/grants matched.
- Impact: a caller knowing another user's UUID could access exports or destroy
  their data/account through the database boundary.
- Repair/disposition: migration `202609050001_security_and_account_integrity.sql`
  explicitly rejects null identity and mismatched owner, revokes PUBLIC/anon
  execution, and retains authenticated owner operations. SQL verified.
- Regression: anonymous and unrelated callers fail without changing records;
  owner export/data deletion/account deletion succeed with expected scope.

### S02. Table privileges bypassed RLS, high

- Location/evidence: original `GRANT ALL` on public tables included TRUNCATE,
  REFERENCES, and TRIGGER. TRUNCATE is not restricted by row policies. Hosted
  friendship TRUNCATE grant confirmed; baseline test reproduces it locally.
- Impact: database-role access could affect other users despite correct row policies.
- Repair/disposition: migration 001 revokes these privileges on all eight app
  tables and adjusts future default grants; removes anonymous mutation privileges.
  SQL verified. No direct production database connection was exercised.
- Regression: anonymous/authenticated TRUNCATE and unauthorized table operations
  fail, while ordinary owner operations remain usable. A public PostgREST path
  accepting arbitrary SQL was not established; the confirmed defect is excessive
  database-role privilege, not a demonstrated HTTP TRUNCATE exploit.

### S03. Friendship consent bypass, high

- Location/evidence: `friendships` insert/update policies permitted accepted
  inserts, requester acceptance, or participant replacement.
- Impact: a user could obtain friend-only visibility without the recipient's consent.
- Repair/disposition: migration 001 requires pending inserts, immutable participants,
  and recipient-only acceptance in a database trigger. SQL verified.
- Regression: direct SQL attempts cover accepted insertion, requester acceptance,
  participant swapping, pending requester access, and valid recipient acceptance.

### S04. Inconsistent privacy across tables and RPCs, high

- Location/evidence: ranking/snapshot/aggregate SELECT policies and legacy
  `get_ranking_history`, `get_sparkline_data`, `get_latest_snapshot` definitions
  did not consistently call the existing visibility predicate.
- Impact: direct database access or older function overloads could reveal private
  or friend-only listening data.
- Repair/disposition: migration 001 applies the existing public/friends/private
  semantics across these paths and scopes friendship-status checks. SQL verified.
- Regression: three visibility settings and five identities (anonymous, owner,
  unrelated user, pending requester, accepted friend), across five tables and nine
  RPC calls. The matrix contains 210 checks, plus explicit mutation tests.

### S05. Provider credentials in logs and browser sessions, high

- Location/evidence: OAuth callback/session logging, browser provider-token reads,
  and user access to `spotify_connections` exposed long-lived provider credentials.
- Impact: logs or browser session consumers could obtain Spotify refresh tokens.
- Repair/disposition: callback logging removed; provider credentials stripped from
  persisted Supabase sessions, including old sessions passing through middleware.
  Migration 001 makes the connection table service-only. The server token endpoint
  returns only an access token with `private, no-store`. Protocol/cookie tests pass;
  real OAuth verification remains blocked on a designated Spotify test account.
- Regression: existing callback sessions are processed, redirects retain refreshed
  cookies, and sanitized sessions omit provider credentials.

### S06. Ranking rows could name a different snapshot owner, high

- Location/evidence: separate `snapshot_id` and `user_id` foreign keys in ranking
  tables did not require the snapshot to belong to the ranking owner.
- Impact: direct writes could contaminate another user's snapshot relationships.
- Repair/disposition: migration 001 adds composite ownership constraints, retaining
  the existing relationship names. SQL verified. Migration deliberately fails on
  historical mismatches rather than deleting or guessing ownership.
- Regression: cross-owner ranking inserts fail; same-owner inserts succeed.

### C01. Expired Spotify tokens and reconnect races, high

- Location/evidence: server and playback paths reused provider tokens beyond their
  lifetime; Supabase session refresh does not refresh provider credentials.
- Impact: a valid website session could have broken stats or playback; concurrent
  reconnect/rotation could lose newer credentials.
- Repair/disposition: server refresh protocol, bounded per-user cache, browser
  access-token retrieval, one forced 401 retry, and conditional rotation updates.
  Unit/protocol tests pass; real Spotify and multi-instance operation need testing.
- Regression: expiry, omitted/rotated refresh tokens, temporary errors, account
  switching, late responses after logout, forced refresh, lost-update retry and
  rejected old grants racing with a new connection, bounded to one retry.

### C02. Callback redirects and refreshed cookies, high

- Location/evidence: `proxy.ts`, `lib/supabase/middleware.ts`, auth callback and
  `components/auth-redirect.tsx` could skip callbacks for existing users, lose
  refreshed cookies on redirects, or hide the reconnect/error landing page.
- Impact: reconnect loops and inconsistent authentication after redirects.
- Repair/disposition: always process callback paths, copy response cookies, validate
  destination paths, use a configured canonical origin, and keep reauth/error
  pages reachable. Real Supabase SSR cookie-serialization tests pass with mocked
  network responses. Hosted cookie behavior still requires browser verification.
- Regression: returning user callback, expired session redirect, safe `next` path,
  external destination rejection, and reconnect/error landing navigation.

### C03. Partial and concurrent snapshot corruption, high

- Location/evidence: dashboard and scheduled collectors inserted the snapshot and
  ranking tables in separate requests; retry could skip a partially written day.
  Existing/previous query failures were not always distinguished from empty data.
- Impact: missing history, wrong previous ranks, and false successful collection.
- Repair/disposition: migration `202609050002_atomic_snapshots.sql` adds a shared
  `persist_snapshot` transaction, user-level locking, previous-ranking lookup, all
  inserts, and aggregate refresh. Both collectors use it. Range failures preserve
  completed ranges and leave failed ranges retryable. SQL and route tests pass.
- Regression: repeated snapshots, malformed rows/aggregate failure rollback,
  successful retry, empty history, per-range partial success, and truthful skip
  counts. Real two-session scenarios pass on native PostgreSQL 17.11.

### C04. Calendar-day uniqueness depended on timezone, high

- Location/evidence: `get_date_only` used session-local date conversion; the web
  collector's end-of-day bound omitted fractional timestamps.
- Impact: inconsistent daily uniqueness or redundant work near midnight.
- Repair/disposition: UTC-only immutable index expression, reindex, shared exclusive
  next-midnight bounds, and explicit 24-hour UTC windows. SQL and pure tests pass.
- Regression: fractional last second, month/year boundaries, non-UTC session
  timezone and DST boundary. Preflight must precede production reindexing.

### C05. Aggregate refresh and deletion were inconsistent, high

- Location/evidence: `update_artist_listening_stats` refreshed globally and retained
  stale data; collection/deletion could race with aggregate writes.
- Impact: stale counts after deletion or snapshots and work across unrelated users.
- Repair/disposition: owner/service-scoped refresh helper, deterministic aggregation,
  stale row removal, and shared advisory locking before writes in collection and
  both deletion operations. Same-day retries repair aggregates. SQL verified;
  separate-session locking assertions also pass on native PostgreSQL 17.11.
- Regression: refresh own scope, remove stale artist rows, rollback failed aggregate
  refresh, and queued data deletion after collection.

### C06. Scheduled collection omitted users and mishandled failures, high

- Location/evidence: `supabase/functions/collect-snapshots/index.ts` read one capped
  connection result, did not reliably stop on rate limits, and ignored some writes.
- Impact: users past the response cap missed collection; retries could waste quota
  or overwrite a newer connection state.
- Repair/disposition: keyset pagination, shared tested collector, bounded batches,
  Retry-After propagation, conditional credential/status updates and explicit
  failed/deferred results. Unit tests and native Deno type checking pass.
- Regression: more than one connection page, token/top-item 429, partial retry,
  stale invalid-grant/reconnect race, metadata write failure, and bad client secret.

### C07. Profile creation and ownership checks, high

- Location/evidence: signup function referenced a nonexistent username column;
  profile insert/update checks compared the profile primary key instead of user_id.
- Impact: failed profile creation or valid users unable to maintain settings.
- Repair/disposition: migration 001 corrects ownership, signup fields and trigger
  installation. SQL verified using synthetic auth users.
- Regression: fresh signup creates one profile; owner changes succeed; unrelated
  profile writes fail. Real Supabase signup remains an integration check.

### C08. Account operations were incomplete or partially destructive, high

- Location/evidence: `app/api/user/delete-account/route.ts` used separate destructive
  operations; exports omitted profile/social/aggregate/connection metadata.
- Impact: partial account removal on failure and incomplete user exports.
- Repair/disposition: one atomic owner RPC for account deletion followed by logout;
  listening-data deletion retains account/profile/friends/connection; exports include
  all app data categories with credential fields omitted. SQL and route tests pass.
- Regression: account cascade, data-only deletion, failure leaves account/session
  intact, empty export, and metadata completeness without refresh tokens.

### C09. CSV quoting and formula interpretation, medium

- Location/evidence: export conversion did not consistently quote content and protect
  formula-like text.
- Impact: malformed spreadsheet rows or formula evaluation when an export is opened.
- Repair/disposition: `lib/export-data.ts` quotes CSV values, preserves line breaks,
  neutralizes formula prefixes and includes the additional export sections. Tests pass.
- Regression: quotes, commas, multiline fields, formula prefixes, and empty sections.

### C10. Friendship API validation and false success, medium

- Location/evidence: friendship routes interpolated unvalidated IDs into PostgREST
  filters; accept did not require a matching incoming request; lookup failures could
  be treated as no friendship.
- Impact: malformed filters, misleading success and erroneous request attempts.
- Repair/disposition: shared JSON/UUID validation, recipient filter plus exact changed
  count, and explicit error handling. Route tests pass; database policy tests provide
  the independent authorization boundary.
- Regression: malformed JSON and filter expressions, anonymous caller, no matching
  request, valid acceptance, and failed lookup before mutation.

### C11. History and charts displayed the wrong scope or stale ranks, medium

- Location/evidence: sparkline queries omitted selected range/target identity and
  truncated long windows; history treated an old last appearance as current rank.
  Friend views selected a single range's latest snapshot for other ranges.
- Impact: misleading charts/rank changes or missing friend history.
- Repair/disposition: scoped/paginated sparkline query, integer window validation,
  current snapshot comparison, per-range friend snapshot selection, and corrected
  owner/private and username handling. Ranking/route and SQL history tests pass.
  `lib/spotify/helpers.ts` now propagates snapshot/ranking query failures rather
  than presenting failed history reads as all-new items; 12 public-helper tests
  cover those failures, valid previous ranks and legitimate empty history.
- Regression: item absent from latest snapshot, reentry, empty history, large windows,
  different users/ranges. Chart presentation requires browser verification.

### C12. Request and playback lifecycle cleanup, medium

- Location/evidence: sparkline loader in-flight refs survived effect cancellation;
  player initialization and callbacks could outlive the account/component.
- Impact: stuck charts, stale playback state and account-crossing late results.
- Repair/disposition: cancellable chart effects, query/cache invalidation on identity
  and data deletion, cancellable SDK initialization with timeouts and listener cleanup,
  corrected polling dependencies and device query parameters. Lifecycle tests pass.
- Regression: unmount before SDK loads, SDK/token timeout, logout during token retry,
  disconnect event ordering. Actual audio/device transfer still needs Spotify testing.

### C13. Missing Spotify metadata and collaborator filtering, medium

- Location/evidence: raw types assumed popularity/images/genres existed; artist track
  filtering considered only the first credited artist.
- Impact: broken/false metadata and omitted collaborator tracks.
- Repair/disposition: pure normalizers retain unknown popularity as null, omit unknown
  badges, preserve reported zeroes, and safely default images/genres. Album derivation
  is shared with snapshot persistence. All credited artists are considered without
  renumbering original ranks. Five normalization/render tests pass.
- Regression: omitted fields, complete legacy payload, zero popularity, album ties,
  and collaborator appearing second in the artist list.

### O01. Setup and schema validation could not establish a working baseline, medium

- Location/evidence: missing `.env.local.example`, missing schema documentation,
  Bash/WSL-only validator, raw password URL construction, shared temporary directory,
  and schema workflow reporting success after a failed step.
- Impact: Windows setup failed and workflow output could mislead maintainers.
- Repair/disposition: platform-neutral Bun validator, environment template, CI,
  password encoding, unique temporary files with scoped cleanup, quoted branch name,
  truthful failure summary, and deployment/schema documentation. Validator, shell
  syntax, lint and build pass. Hosted schema sync and GitHub CI were not executed.
- Regression: missing required files/secrets references, scheduled/manual workflow
  shape, clean credential-free build; verify hosted sync on a later approved release.

## Dependencies and provider compatibility

Next.js and its ESLint config were updated from 16.1.1 to 16.3.4, with Sharp 0.35.4.
This follows the [official August security release](https://nextjs.org/blog/august-2026-security-release).
The published vulnerable version was confirmed; exploitability of every advisory in
this particular deployment was not reproduced. Targeted overrides select patched
ws and PostCSS versions for the [ws advisory](https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p)
and [PostCSS advisory](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp).
ESLint, shadcn and the Tailwind PostCSS integration received compatible updates.
The shadcn CLI is now a development dependency; its existing CSS import remains.
No framework replacement or general major-version upgrade was attempted.

The follow-up repaired the remaining advisories in these 16 transitive package names:
`@babel/core`, `@humanfs/node`, `@isaacs/brace-expansion`, `ajv`, `body-parser`,
`brace-expansion`, `browserslist`, `diff`, `fast-uri`, `flatted`, `js-yaml`,
`minimatch`, `path-to-regexp`, `picomatch`, `postcss-selector-parser`, and `qs`.
Targeted transitive updates were generated using temporary Bun 1.4.2, whose
[update command](https://bun.sh/docs/pm/cli/update) supports selecting nested
packages without adding them as direct dependencies. The project's Bun 1.3.14
runtime and CI pin remain unchanged. All 35 requesting dependency ranges for
these packages were checked against their resolved versions and still match;
older compatible majors remain installed where required. Examples include
minimatch 3.1.5/9.0.9/10.2.6, brace-expansion 1.1.18/2.1.4/5.0.9, Babel 7.29.7,
fast-uri 3.1.7, and qs 6.16.0. No new direct dependencies or global tool upgrades
were introduced in this follow-up.

Fresh `bun audit` reports no known vulnerabilities. Frozen-lockfile installation,
lint, application tests, production build, SQL core tests and the shadcn CLI
version command pass. CI now runs `bun audit` to detect newly reported advisories.
This closes the known dependency findings; it is not proof of absence of unknown
vulnerabilities.

Provider refresh follows [Supabase's provider-token guidance](https://supabase.com/docs/guides/auth/social-login#provider-tokens)
and [Spotify's refresh protocol](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens).
The metadata changes accommodate [Spotify's February 2026 changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026).
Those restrictions depend on app mode/cohort; Spotify's
[developer-access update](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
postponed changes for existing integrations. The hosted app's quota mode, granted
scopes, refresh-token policy and user eligibility were not established. Followed
artist and playback endpoint compatibility therefore still needs authenticated
testing, rather than assuming every existing integration lost those endpoints.

## Fresh verification and remaining blockers

| Check | Final result |
| --- | --- |
| Lockfile install | Passed with `--frozen-lockfile` |
| Lint | Passed, no warnings |
| TypeScript | Passed |
| Bun unit/server tests | 83 passed, including the release maintenance gate; test files run in separate processes to isolate module mocks |
| `test:db:core` | Passed baseline exploit reproduction, both migrations, security and atomic snapshot suites |
| `test:db` | Passed native PostgreSQL 17.11: baseline, migrations, SQL suites and all three concurrency scenarios |
| Production build | Passed, Next.js 16.3.4, placeholder public Supabase settings |
| Native Deno check | Passed for collector and its shared modules |
| Schema validator and Bash syntax | Passed |
| Playwright | Eight desktop/mobile public browser tests passed; screenshots captured |
| `git diff --check` | Passed; existing line-ending conversion notices only |
| `bun audit` | Passed, no known vulnerabilities |
| GitHub CI | Added, not run remotely |

The database runner now creates a uniquely named native PostgreSQL cluster with
a random password and an available loopback port. It verifies the data-directory
identity, restores the immutable baseline, applies the repairs, runs the SQL suites,
and tests three real overlapping-session scenarios. All passed on PostgreSQL 17.11:
same-range retry, different-range aggregates, and data deletion queued behind
collection. Successful shutdown and temporary-cluster removal were verified.
No Docker, hosted database URL or production credentials are used. CI now uses
native PostgreSQL as well; that remote job has not been executed in this session.

Both SQL runners use the same Auth schema/claim shim and omit four operational
extension declarations. Actual Supabase Auth, PostgREST and hosted extension
integration remain unverified. Read-only dashboard inspection found the organization
at its two-free-project limit, so a new free isolated Supabase project could not be
created. No other project was paused/deleted and no paid upgrade was made. Next
action: provide an isolated test project when capacity is available. The tested
native SQL path is documented in [SCHEMA_SYNC.md](../SCHEMA_SYNC.md).

The portable Windows binaries remain under
`%LOCALAPPDATA%/statsforspotify/postgres/17.11-3/pgsql/bin`. An initial Windows pipe
inheritance stall was fixed by avoiding capture of pg_ctl's server output. Its
earlier temporary directory `statsforspotify-db-test-NrCTDL` and the downloaded
archive remain: automatic approval review blocked that optional cleanup with only
"blocked by policy" as its reason. No native PostgreSQL process remained running
after verification. Successful subsequent runs removed their own fresh clusters.

The prior local-server approval blocker cleared on the follow-up. The server ran
on 127.0.0.1 with placeholder Supabase settings, and Playwright covered public
navigation, filters, login-dialog opening/dismissal, anonymous API rejection and
both motion preferences on desktop/mobile. The runner stops its server afterward.
Screenshots are in `test-results/public-landing-filters-and-cb7f1-ialog-render-without-errors-desktop/`
and the corresponding `-mobile/` directory: `landing.png` (full page) and
`landing-viewport.png`. They are local generated artifacts, overwritten on reruns.

The browser run found two additional confirmed presentation/accessibility defects:

- **C14, medium, reduced-motion content hidden:** `components/animated-section.tsx`
  retained server-rendered opacity zero when hydration detected reduced motion
  and removed its in-view animation. Screenshots exposed the blank content; a
  regression assertion reproduced computed opacity zero. An explicit immediate
  visible animation target fixes it. Both reduced and standard motion browser
  paths now pass without changing normal animation timing or styling.
- **C15, low, duplicate main landmarks:** `app/(public)/page.tsx` rendered a main
  inside `PublicLayout`'s main. Replaced the inner element with a div, preserving
  classes. The strict single-main browser assertion now passes on both sizes.

Screenshot capture loads artwork and uses reduced motion so offscreen animation
does not hide content. These public checks do not establish authenticated behavior.

Authenticated dashboard navigation, filters/charts, friendships and profile settings
still need an isolated Supabase/Spotify test-account browser run and reviewed
desktop/mobile screenshots. Login/logout, real token expiry/revocation, playback
transfer/cleanup, export downloads and disposable-account deletion must be included.
No pre-change screenshot baseline exists from this run; compare the starting commit
against the patch in separate isolated runs before claiming visual preservation.

## Suspected problems and optional backlog

- Legacy partial snapshots: the old schema has no completion marker, and empty
  rankings can be legitimate. Future writes are atomic; existing incomplete history
  was not identified or rewritten. Missing evidence is a reliable completeness
  signal. Next action: assess suspect days using consented test/operational evidence;
  do not delete historical rows based only on empty rankings.
- Large collector populations: pagination is fixed, but a single Edge invocation
  still has a finite runtime. Measure production user count and latency, then add
  a durable continuation mechanism if required. No deadline failure was reproduced.
- Generated schema drift: tests deliberately use the immutable original fixture.
  Before release, compare live definitions with pending migrations and repeat
  preflight counts. The daily sync is an observation of production, not migration
  deployment, and must not overwrite pending migration files.
- Broader component splitting and duplicate UI packages remain optional. Only
  proven duplicate snapshot transforms, token handling and failing lifecycle logic
  were separated. Existing component appearance and route contracts were retained
  where possible; nullable popularity and the new token endpoint update callers in
  the same patch.

See [maintenance deployment](maintenance-deployment.md) for the required coordinated
release, environment variables, preflight SQL, verification steps and rollback
constraints. Generated `supabase/schema/schema.sql` and `lib/supabase/database.ts`
were not manually edited.
