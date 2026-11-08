# Phase 01: Clerk authentication and organization setup

**Date**: 2026-11-07
**Status**: Accepted

## Summary

Clerk provides sign in, sessions, and organization identity. You create or select an organization before entering protected pages, and Graphcode passes Clerk's standard session token to Supabase from the server. A small theme control works on every route and remembers your system, light, or dark choice.

## Context

The scope links this feature to this file and describes manual organization creation and selection, with member management deferred. A separate earlier phase record, `phase-0.md`, documents the original Clerk setup. The current app already has Clerk sign in and sign up routes, a custom organization setup page, server route protection, and validated return paths. It does not yet have a theme control or a Supabase client that uses the Clerk session.

Graphcode has no database tables or auth records yet. The Supabase packages and project settings are present, but database reads and writes are outside this phase. The phase must establish how the token will reach Supabase without creating a second session system, while keeping organization membership as a requirement for using protected app pages.

## Requirements

**User stories**:
* As a developer, I want to sign in with GitHub, Google, or an email verification code so I can use Graphcode with my identity.
* As a signed in user, I want to create or select an organization so Graphcode has the organization context required for my work.
* As an organization member, I want to manage my session and active organization from the app.
* As a user, I want to choose a theme that stays consistent when I move between routes or reload.

**Acceptance criteria**:
* **AC-1**: Local development uses the accountless Clerk development app at `http://localhost:3000`. The public sign in and sign up routes offer GitHub, Google, and email verification code sign in. Clerk owns its callback flow. `CLERK_SECRET_KEY` is server only. If enabling a selected method requires claiming the app or supplying OAuth credentials, pause and ask rather than changing methods or claiming the app.
* **AC-2**: Clerk Organizations use Membership optional mode so a signed in user can reach Graphcode's organization setup page. `/sign-in` and `/sign-up` are public. `/organizations` requires a signed in Clerk session but not an active organization. Every other app page and route handler requires both a valid session and an active organization. Missing or invalid auth configuration never grants public access.
* **AC-3**: A user with no active organization is sent to `/organizations`. They can select a membership or create an organization by entering its name. Graphcode trims the name and rejects an empty or whitespace only value. Clerk enforces its own name limits and other creation constraints; show its errors and preserve the entered name for retry. Graphcode never guesses or derives a name from the user's profile. After selection or creation and activation, the user returns to the validated requested path and query, or `/` when no valid destination was requested.
* **AC-4**: A valid Clerk organization invitation can be accepted through Clerk's standard flow. Graphcode does not send invitations. After acceptance, the user continues through the normal organization guard and return flow.
* **AC-5**: When a protected request sends a signed out visitor to sign in or sign up, preserve its path and query as a validated, app local `returnTo` through Clerk's callback and any organization setup step. Use the existing `getValidatedReturnTo` helper at each server route boundary for sign in, sign up, and organization setup. Pass only its normalized local path and query to Clerk's successful sign in or sign up redirect setting and to the final redirect. Reject external or malformed destinations and fall back to `/`.
* **AC-6**: Protected server pages, route handlers, and server actions enforce their required session state with Clerk's asynchronous `auth()` result. Protected app behavior requires `userId` and `orgId`. The `/organizations` page requires only `userId`. Organization list, selection, and creation use Clerk's session authenticated client API, not app server actions.
* **AC-7**: This phase creates no local user, organization, or membership records, no webhook sync, no database table, and no Supabase Auth session. Clerk is the source of truth for identity and memberships.
* **AC-8**: Graphcode exposes no invitation sending, member management, or membership role changes. Clerk's default organization roles remain in use.
* **AC-9**: The shared signed in header on app pages and `/organizations` includes the Clerk user menu and limited organization selection and creation controls. The sign in and sign up routes use a compact two panel layout with concise Graphcode context and Clerk's prebuilt components, in the existing neutral styling with a blue accent and no imagery or motion.
* **AC-10**: `/organizations` lists the signed in user's memberships by name and allows each to be selected. It provides an inline organization name field and create action, foregrounds creation for an empty list, and uses Clerk's returned order with a page size of 10 so every membership is reachable. Loading and pending states are clear. After creation, explicitly activate the returned organization. If activation fails, retain the created organization and offer retry without creating it again. Show Clerk failures, preserve the entered name after creation failure, and allow retry.
* **AC-11**: One server side Supabase client uses `@supabase/supabase-js` and Clerk's standard session token through its `accessToken` callback. Configure Clerk's Supabase integration and register Clerk as a Supabase third party auth provider so Supabase accepts the token and its authenticated role and active organization claims (basis: Supabase third party auth and JWT claims documentation). Do not use a custom JWT template, Supabase Auth cookies, or a service role key. No database query is added in this phase (basis: installed `supabase-js` access token option).
* **AC-12**: A theme control is available on sign in, sign up, organization setup, and protected app routes. It offers `system`, `light`, and `dark`, stores the choice in browser `localStorage`, and applies the choice to the root element so the color tokens respond. `system` follows operating system changes; explicit light and dark choices override the system and persist after reload.
* **AC-13**: `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` pass. The app starts with `pnpm dev`, and the developer can verify sign in, organization setup, invitation acceptance, theme behavior, and protected access manually in a browser.

## Options considered

### Option 1: Keep and extend the current Clerk flow

Retain the existing Clerk routes, organization setup, and guards. Add the agreed Supabase token handoff and theme control, and correct any gaps against this spec. This follows the current app and linked scope (basis: `app/`, `docs/scope/scope.md`, and the existing phase 01 spec).

**Pros**:
* Preserves working sign in, organization, and return flows.
* Adds no parallel session or database system.
* Keeps the build small enough to verify as one end to end path.

**Cons**:
* The existing code must be checked against the corrected requirements rather than assumed complete.

### Option 2: Build a parallel replacement and migrate later

Build a new auth and organization path beside the existing one, then switch users over after both paths are available. This is appropriate when a live system needs a gradual migration (basis: strangler pattern for production migrations).

**Pros**:
* Allows a staged cutover when existing users or deployed traffic must be protected.
* Makes rollback possible while both paths run.

**Cons**:
* Duplicates routes, session behavior, and operational work for a local development feature with no production users.
* Creates more opportunity for inconsistent authorization.

### Option 3: Replace the current auth flow directly

Remove the existing custom organization setup and build a new flow around Clerk's built in organization task or a full profile component (basis: Clerk organization features and the current application implementation).

**Pros**:
* Could reduce custom UI if the app accepted Clerk's default organization flow.
* Uses a provider owned flow for more organization actions.

**Cons**:
* Conflicts with the confirmed requirement for a user named organization and a limited app surface.
* Replaces working code without a production migration need.

## Decision

**Chosen option**: Option 1: Keep and extend the current Clerk flow

Use Clerk Membership optional mode with Graphcode's named organization creation and membership selection. Accept Clerk invitations through the standard provider flow, but do not add invite or member controls. Configure Supabase third party auth with Clerk's ordinary session token and keep the client server side. Add a three state theme control on all routes and persist its choice in `localStorage` (basis: confirmed user choices, the existing application flow, and Supabase's current third party auth guidance).

**Implementation skills**: `clerk-setup` (user skill, `C:/Users/ntg56/.agents/skills/clerk-setup/`) · `clerk-orgs` (user skill, `C:/Users/ntg56/.agents/skills/clerk-orgs/`) · `clerk-nextjs-patterns` (user skill, `C:/Users/ntg56/.agents/skills/clerk-nextjs-patterns/`) · `supabase` (project skill, `D:/graphcode/.agents/skills/supabase/`)

## Rationale

The current app already has the desired Clerk based sign in, organization creation, selection, route protection, and return flow (basis: `app/`, `docs/scope/scope.md`, and `AGENTS.md`). Extending those paths preserves the existing behavior and avoids the risk of a parallel or replacement session implementation. Membership optional mode lets Graphcode show its custom organization page after sign in; the server guard still prevents access to protected content without `orgId` (basis: the confirmed membership mode and Clerk's organization patterns).

The organization name must come from the user because there is no agreed profile field or fallback name. Trim it and reject blank input, then let Clerk enforce its current creation constraints rather than inventing a uniqueness rule. Keep the existing page size of 10 and Clerk returned ordering so this clarification does not change current list behavior (basis: `app/components/organization-setup.tsx` and Clerk's membership list). The existing `getValidatedReturnTo` helper must guard every route boundary, preventing individual routes from developing different rules (basis: `app/lib/return-to.ts`). Accepting a Clerk invitation uses provider behavior without introducing unapproved membership mutations in Graphcode. For Supabase, the current third party auth integration accepts Clerk session tokens and avoids the older custom JWT template path (basis: Supabase's current Clerk third party auth guide). The installed Supabase client supports an async `accessToken` callback, so Clerk can remain the only session owner (basis: `supabase-js` 2.119.0, Supabase's JavaScript client initialization guide, and the single session owner principle). The Supabase SSR guide's cookie flow is for Supabase Auth sessions, which this app does not use (basis: Supabase's SSR client guide). The theme is a browser preference, not organization data, so `localStorage` is the smallest source that survives reload without adding server state (basis: `docs/project-doc.md` and the confirmed theme choices).

## Feature design

**Data model sketch**:
* Clerk user, organization, and membership remain provider managed. Graphcode creates no auth tables or copied records.
* The active organization ID comes from `orgId` in Clerk's awaited `auth()` result.
* Theme preference is one browser local value, `system`, `light`, or `dark`, stored under `graphcode-theme`. It has no database relationship.
* The Supabase client is created per server request and receives that request's Clerk session token. It stores no session of its own.

**State transitions**:
* Session: signed out to signed in, or signed in to signed out. Clerk owns session creation and termination.
* Organization: signed in without an active organization to selected or created membership, then active organization. A failed activation after creation retains the created organization for retry.
* Theme: `system`, `light`, or `dark` selection applies to the root element. `system` follows the operating system; explicit choices take precedence.

**API surface**:

| Surface | Method | Inputs | Outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/sign-in` | GET | Clerk parameters and optional `returnTo` | Clerk session and validated redirect | Public | Invalid credentials, provider failure |
| `/sign-up` | GET | Clerk parameters and optional `returnTo` | Clerk session and validated redirect | Public | Invalid or expired verification code, provider failure |
| `/organizations` | GET and Clerk client operations | Membership page, selected organization ID, entered organization name trimmed and checked for blank input, optional `returnTo` | Membership list in Clerk order, active organization, redirect to validated destination or `/` | Server page requires `userId`; client operations require a valid Clerk session | Membership load, create, select, or activation failure |
| Protected app pages, route handlers, and server actions | Request or action | Clerk session | `userId` and active `orgId` for server use | Signed in with active organization | Sign in redirect or organization setup redirect |
| Supabase server client | Server construction per request | Supabase URL and publishable key, Clerk session token | Authenticated Supabase client | Server request with a valid Clerk session | Missing configuration, missing token, rejected third party token |
| Theme control | User selection | `system`, `light`, or `dark` | Persisted preference and root element theme | Public | Invalid stored value falls back to `system` |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Sign in methods | GitHub, Google, and email verification code | Clerk development instance configuration |
| Protected route access | User and organization IDs | `userId` and `orgId` from awaited Clerk `auth()` |
| Organization list | Membership IDs and names, and pagination state | Clerk's signed in organization memberships, using page size 10 and returned ordering |
| Organization creation | Organization name and new organization ID | User entered name after trimming and blank input rejection, then Clerk create result and its constraints |
| Organization selection | Active organization ID | Selected membership validated by Clerk |
| Invitation acceptance | Invited organization membership | Clerk's standard invitation flow |
| Return destination | Local path and query | Requested protected URL, validated against `APP_ORIGIN` |
| Supabase authorization | Session token and organization claims | Clerk's standard session token and configured Supabase third party auth |
| Theme | Current mode and persisted preference | User selection in `localStorage`, or system preference when set to `system` |

**Key invariants**:
* Only `/sign-in` and `/sign-up` are public. `/organizations` requires `userId`; every other app route requires `userId` and `orgId`.
* Organization creation and selection are performed with Clerk's session authenticated client API. Clerk validates membership operations.
* A failed organization activation never repeats organization creation.
* The app does not send invitations, manage members, or change roles.
* Clerk is the only session system. Supabase never stores or refreshes an independent user session.
* The Supabase client is server side and uses the signed in user's token. A publishable key is allowed; a service role key is never used.
* Database row access is decided by Postgres policies in the database phase, not application filters. No table or database query is introduced here.
* The theme preference is device local and never changes authorization or organization state.

**Security model**:
* Clerk protects app routes. Server pages, route handlers, and server actions check the required session and organization context with awaited `auth()`; client rendering is not an authorization boundary (basis: the existing server guard and Clerk's Next.js `auth()` reference).
* One shared `returnTo` validator is used by sign in, sign up, organization setup, and final redirects. It accepts only a safe local path and query validated against the required `APP_ORIGIN`. Reject protocol relative URLs, schemes, backslashes, control characters, malformed values, and any parsed URL with a different origin. Revalidate before the final redirect and fall back to `/`.
* Supabase verifies Clerk as a configured third party identity provider. The client sends the Clerk session token only from server code. Do not expose `CLERK_SECRET_KEY`, use Supabase Auth cookies, or use a Supabase service role key for user requests.
* Later row access policies use the organization claim in the verified token. This phase creates no table or policy.
* No special regulatory or data residency requirements were identified for account data.

**Configuration required**:
* `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key.
* `CLERK_SECRET_KEY`: Clerk secret key, server only.
* `APP_ORIGIN`: local return destination origin, set to `http://localhost:3000`.
* `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
* `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key.
* Clerk Organizations enabled with Membership optional mode and the selected local sign in methods.
* Clerk Supabase integration enabled and Clerk registered as a third party auth provider in Supabase.

**Critical test scenarios**:
* Sign in or sign up with each configured method, create or select an organization, then load a protected page, verifies **AC-1**, **AC-2**, **AC-3**, and **AC-6**.
* Accept a valid Clerk invitation and confirm the organization guard and return flow continue, verifies **AC-4**.
* Start at a protected URL with a query while signed out, then complete sign in and organization setup; confirm the exact local path and query are restored, verifies **AC-5**.
* Confirm signed out visitors cannot receive protected page content, and signed in users without `orgId` cannot access protected routes, verifies **AC-2** and **AC-6**.
* Confirm the server Supabase client receives the Clerk session token and Supabase accepts it as third party auth, with the authenticated role and active organization claim, verifies **AC-7**.
* Switch among all three themes, reload, and confirm system changes are followed only in `system` mode, verifies **AC-12**.
* Confirm organization pagination, creation, explicit activation, retry after activation failure, and visible Clerk errors without duplicate creation, verifies **AC-3** and **AC-10**.
* Confirm blank organization names are rejected and Clerk name constraint failures are visible while the entered name remains available for retry, verifies **AC-3** and **AC-10**.
* Confirm the account and organization controls do not expose invitation sending, member management, or role changes, verifies **AC-8**.
* Run type check, lint, production build, and local startup, verifies **AC-13**.

## Build plan

1. Stand up a thin end to end thread through Clerk sign in, organization selection or creation, protected route enforcement, and a per request Supabase client using Clerk's session token. Preserve the validated return path and keep Clerk as the only session owner, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-6**, **AC-7**, and **AC-11**.
2. Complete the organization and account experience with standard invitation acceptance, page size 10 and Clerk returned ordering, clear validation and provider errors, activation retry, and the shared header controls without member management, satisfies **AC-3**, **AC-4**, **AC-8**, **AC-9**, and **AC-10**.
3. Add the persisted three state theme control across authentication, organization setup, and protected routes, applying the selected mode to the root element, satisfies **AC-12**.
4. Run type check, lint, production build, and local startup. Leave browser acceptance to the developer, satisfies **AC-13**.

## Consequences

**Positive**:
* Organization identity remains provider managed and is available to server code.
* The current sign in and organization flow remains the basis for the build.
* The Supabase client carries the authenticated user's token without a second session system or database table.
* Theme choice stays local to the browser and works before sign in.

**Negative / tradeoffs**:
* Clerk and Supabase each need their third party integration configured outside the codebase.
* Membership optional mode allows a Clerk session without an organization, so every protected app surface must keep enforcing `orgId`.
* The app supports accepting provider issued invitations but cannot send them or administer memberships.
* Theme preference does not follow a user across browsers or devices.

**Neutral**:
* Clerk production keys and production provider configuration remain deferred.
* Database tables, row policies, and user data queries remain in the database phase.

## Follow-up

* [ ] Add `clerk-setup` conventions to `app/AGENTS.md` before implementation.
* [ ] Add `clerk-orgs` conventions to `app/AGENTS.md` before implementation.
* [ ] Add `clerk-nextjs-patterns` conventions to `app/AGENTS.md` before implementation.
* [ ] Add `supabase` conventions to the root `AGENTS.md` rules before implementation.
* [ ] Design invitation sending and member management with durable audit records as a later feature.
* [ ] Configure production Clerk settings after the app is claimed and a production domain is available.

## References

**Project sources**:
* `AGENTS.md`, server side database access and organization policy principles.
* `docs/project-doc.md`, organization identity, theme preference, and database access principles.
* `docs/scope/scope.md`, linked phase intent and deferred member management.
* `docs/specs/phase-0.md`, the other existing Clerk phase record.
* `app/`, the current Clerk routes, organization setup, and protected access.
* Installed Clerk and Supabase SDK versions in `package.json`.

**Practices and standards**:
* Provider issued session tokens for third party auth.
* Server side authorization checks and database row level security.
* One session owner per application.

**Links**:
* Supabase third party auth with Clerk: https://supabase.com/docs/guides/auth/third-party/clerk.md
* Supabase JWT claims: https://supabase.com/docs/guides/auth/jwts.md
* Supabase JavaScript client initialization: https://supabase.com/docs/reference/javascript/initializing
* Supabase server side client guide: https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
* Clerk Next.js `auth()` reference: https://clerk.com/docs/reference/nextjs/app-router/auth
