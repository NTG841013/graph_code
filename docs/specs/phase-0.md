# Phase 01: Set Up Clerk Authentication

**Date**: 2026-11-07
**Status**: Superseded by [phase-01](phase-01.md)

## Summary

Clerk will provide sign in, sessions, and organization identity for Graphcode. The app will require an organization before showing protected pages, while letting users create or select an organization. Sign in and sign up use Clerk's prebuilt forms in a compact two panel layout. This first setup is for local development and does not add organization member management or database records.

## Context

> ⚠️ Premise note: This work touches authentication, organization onboarding, and member administration. This spec covers Clerk setup and the organization creation and selection needed to use the app. Member administration is deferred until durable audit storage is designed with the database.

Graphcode has no authentication integration yet. Its product decisions require GitHub, Google, or email identity, and require analyses to belong to an organization. The app uses Next.js 16 and pnpm, so its auth integration must use the current Next.js routing model and keep server secrets out of client code.

The app also has no database integration or audit store yet. Creating organizations and switching between them are needed for the initial signed in flow. Sending invitations and changing memberships are access control mutations, so they remain out of this phase until durable audit storage is designed with the database.

## Requirements

**User stories**:
* As a developer, I want to sign in with GitHub, Google, or an email verification code so that I can use Graphcode with my identity.
* As a signed in user, I want to create or select an organization so that Graphcode has the organization context required for my work.
* As an organization member, I want an account menu and an organization selector so that I can manage my session and active organization.

**Acceptance criteria**:
* **AC-1**: Local development runs with an accountless Clerk development app configured through the Clerk CLI at `http://localhost:3000`. The sign in and sign up routes offer GitHub, Google, and email verification code sign in. Clerk handles its standard callback flow. The secret key is server only. If enabling a selected provider requires claiming the app or supplying OAuth credentials, setup pauses and asks the user rather than changing providers or claiming the app.
* **AC-2**: `/sign-in` and `/sign-up` are public. `/organizations` requires a signed in Clerk session but no active organization. All other app routes require a signed in session and active organization. Missing or invalid Clerk configuration never falls back to public access.
* **AC-3**: Organization membership is required. A signed in user with no active organization is sent to `/organizations`, where they can create or select an organization. When a protected request sends a signed out visitor to sign in or sign up, preserve its pathname and query as a validated, app local `returnTo` through Clerk's callback and any `/organizations` step. Pass the validated destination to Clerk's successful sign in or sign up redirect setting. If the returned session has no active organization, carry the same `returnTo` to `/organizations`; after creation or selection, return to that destination, or `/` if none was requested or it is invalid. A user arriving through a valid Clerk invitation can accept it through Clerk's standard invitation flow, then continue to `/organizations`. The end to end flow preserves both pathname and query.
* **AC-4**: Protected app pages and route handlers require both a signed in user and an active organization. On each server request, Clerk's asynchronous `auth()` result supplies `userId` and `orgId`. Server actions enforce the same requirements as the page or route they serve. The `/organizations` server page requires `userId` but not `orgId`; organization creation and selection use Clerk's session authenticated client API, not app server actions. Clerk validates each client operation against the signed in session. A shared signed in header on app pages and `/organizations` provides Clerk's user menu and limited organization selection and creation controls.
* **AC-5**: This phase creates no local user, organization, or membership records, and no webhook sync. The active organization ID comes from Clerk session data for server use.
* **AC-6**: The app does not expose organization member management, invitation sending, or membership role changes. The organization selector and creator cannot navigate to those actions. Clerk's default organization roles remain in use.
* **AC-7**: The implementation passes the project's type check, lint, and production build. The developer can start it with `pnpm dev` and verify the flows manually in a browser.
* **AC-8**: `/sign-in` and `/sign-up` share a compact two panel layout. One panel gives concise Graphcode context; the other contains Clerk's prebuilt sign in or sign up component. Use the existing neutral styling with a blue accent, without imagery or motion.
* **AC-9**: `/organizations` shows a compact organization setup page beneath the shared signed in header. It lists the signed in user's Clerk organizations by name, with a select action for each, and provides an inline create form with an organization name field and create action. When there are no organizations, creation is the primary action. If Clerk paginates memberships, provide page navigation so every membership can be selected. Show a clear loading state while memberships load or a selection, creation, or activation is pending. After creation, explicitly activate the returned organization. If activation fails, keep the created organization available and offer an activation retry without repeating creation. Show Clerk failures in the page, preserve the typed name on creation failure, and allow retry without exposing member or invitation actions.

## Options considered

### Option 1: Clerk CLI with prebuilt auth pages and limited organization controls

Use the Clerk CLI to configure the Next.js integration, place Clerk's prebuilt sign in and sign up components in the agreed two panel layout, and provide only organization creation and selection inside the app.

**Pros**:
* Matches the setup process chosen for this project and reduces hand written authentication wiring.
* Keeps identity and membership data with the provider.
* Avoids exposing membership mutations before durable audit storage exists.

**Cons**:
* The CLI may make changes beyond the package install, so its diff must be reviewed.
* A small organization selection surface still needs app specific behavior.

### Option 2: Manually configure Clerk with the same screens

Install and wire the Clerk SDK using its Next.js instructions, without using the CLI.

**Pros**:
* Each code and configuration change is explicit.
* Avoids CLI changes to files outside the intended integration.

**Cons**:
* Requires more manual setup and can miss Next.js 16 specific integration details.
* Does not match the setup method selected for this project.

### Option 3: Build custom authentication flows around Clerk

Use Clerk for identity and sessions, but build custom sign in, sign up, and organization flows.

**Pros**:
* Gives the app full control over the authentication experience.
* Allows precise control over which organization actions are visible.

**Cons**:
* Adds custom authentication UI and state handling to a project with no established app shell.
* Creates more code to maintain than the prebuilt auth screens needed for this setup.

## Decision

**Chosen option**: Option 1: Clerk CLI with prebuilt auth pages and limited organization controls

Use `pnpm dlx clerk@latest init` for an accountless local development app at `http://localhost:3000`, then place Clerk's prebuilt sign in and sign up components in a compact two panel layout with brief Graphcode context beside each form. Keep the existing neutral styling with a blue accent, without imagery or motion. Use Clerk's session authenticated client API for organization listing, creation, and activation, with server checks on protected routes. Require organization membership, provide organization creation and selection, and do not provide member management or invitation controls in this phase. If Clerk requires app claiming or OAuth credentials to enable a selected sign in method, pause and ask the user.

**Implementation skills**: `clerk-setup` (user skill, `~/.agents/skills/clerk-setup/`) · `clerk-orgs` (user skill, `~/.agents/skills/clerk-orgs/`) · `clerk-nextjs-patterns` (user skill, `~/.agents/skills/clerk-nextjs-patterns/`) · `clerk-custom-ui` (user skill, `~/.agents/skills/clerk-custom-ui/`)

## Rationale

The project has already chosen Clerk as its identity provider, and there is no existing auth code to preserve. The CLI is the selected setup path and is the smallest way to wire Clerk into this Next.js 16 app. The two panel wrapper gives people brief Graphcode context while the prebuilt components continue to own sign in state and provider flows. Session authenticated Clerk client operations keep organization listing and active organization changes with the provider; server checks still guard app routes.

Organization membership is required by the product, so the app must establish an active organization before protected pages are usable. The app will keep user, organization, and membership records in Clerk rather than copying them into a database that is not yet integrated. Organization member management is deferred because it changes access and needs durable audit storage.

## Feature design

**Presentation**:
* Sign in and sign up share a compact two panel layout, with concise Graphcode context in one panel and the corresponding Clerk prebuilt component in the other.
* Source the concise product context from the "What it is" section of `docs/project-doc.md`; do not add ungrounded product claims.
* Use the existing neutral styling with a blue accent. Do not add imagery or motion.
* `/organizations` is a compact page beneath the shared signed in header. Show organization memberships by name, each with a select action, and an inline creation form with a name field and create action. When the list is empty, make creation the primary action.
* If Clerk paginates memberships, provide page navigation so every membership remains reachable.
* While memberships load, show a clear loading state. While selecting, creating, or activating, show progress and prevent duplicate submissions. After creation, explicitly activate the returned organization. If activation fails, keep it available and offer activation retry without repeating creation.
* On a Clerk error, show the error on the page, preserve a typed organization name after creation fails, and allow the user to retry.
* Keep selection and creation as the only organization actions. Do not add invitation or member management controls.

**Data model sketch**:
* Clerk user: provider managed identity and email addresses. No local copy.
* Clerk organization: provider managed organization identity.
* Clerk organization membership: provider managed relation between a user and organization, using Clerk's default `org:admin` and `org:member` roles.
* Graphcode stores no auth entities in this phase. Later analysis records use the active Clerk organization ID as their organization key.

**State transitions**:
* Session: signed out to signed in, or signed in to signed out. Clerk owns session creation and termination.
* Organization context: no active organization to selected or newly created organization, then active organization. If creation succeeds but activation fails, the organization remains created and the user can retry activation without creating it again. The app does not allow access to protected pages until an organization is active.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/sign-in` | GET | Clerk sign in parameters; optional `returnTo` path and query | Clerk session and redirect preserving `returnTo` | Public | Invalid credentials, provider failure |
| `/sign-up` | GET | Clerk sign up parameters; optional `returnTo` path and query | Clerk user, session, and redirect preserving `returnTo` | Public | Invalid or expired email code, provider failure |
| `/organizations` | GET and Clerk session authenticated client actions | Selected organization ID or new organization name; optional `returnTo` path and query; Clerk membership page | Paginated organization choices from Clerk memberships, displayed by name; active organization ID; redirect to validated `returnTo` or `/` | Server page requires signed in user; client actions require valid Clerk session | Loading memberships; empty membership list foregrounds creation; invalid return path falls back to `/`; Clerk errors are shown with retry; activation failure retries activation without repeating creation |
| Other app pages and route handlers | Any HTTP method or server action | Clerk session | `userId` and `orgId` from `await auth()` | Signed in with active organization | Missing session redirects to `/sign-in`; missing `orgId` redirects to `/organizations` |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Sign in or sign up | Sign in methods and session result | Clerk configuration and Clerk session |
| Protect app routes and server actions | User ID and active organization ID | `userId` and `orgId` from Clerk server `await auth()`; `/organizations` setup actions require only `userId` |
| List organizations | Page of organization names and IDs, plus whether another page exists | Current page returned by the signed in user's paginated Clerk memberships; an empty first page foregrounds creation |
| Select an organization | Active organization ID | User selection validated by Clerk against the signed in user's memberships |
| Create an organization | Created organization ID | Organization creation result from Clerk |
| Activate a created organization | Active organization ID | Successful Clerk activation of the created organization ID |
| Retry failed activation | Active organization ID | Previously created organization ID retained from the Clerk creation result |
| Show organization setup state | Loading or operation error | Pending Clerk membership, selection, or creation operation; Clerk error result |
| Keep organization name after failed creation | Entered organization name | The user's create form input |
| Render account controls | Signed in account identity | Clerk session and user menu component |
| Preserve requested destination | Path and query | The requested protected URL, carried as `returnTo` through sign in, sign up, and organization setup |
| Validate return destination | Safe local destination | `returnTo` parsed against the required `APP_ORIGIN`; invalid or ambiguous values resolve to `/` |

**Key invariants**:
* Only `/sign-in` and `/sign-up` are public. `/organizations` requires a valid session; all other app routes and their server actions require a valid session and active organization.
* The secret Clerk key is available only in server runtime configuration.
* Clerk is the source of truth for users, organizations, and memberships.
* The app does not allow personal account access or custom organization roles.
* Organization creation and activation are separate Clerk operations. An activation retry never repeats creation.
* Membership pagination never silently hides an organization the signed in user belongs to.
* The app has no UI for sending invitations or changing organization memberships in this phase.

**Security model**:
* Only `/sign-in` and `/sign-up` are public. `/organizations` requires authentication but not an active organization; all other app routes require both authentication and an active organization. Server actions enforce the same rule as their page or route.
* The organization ID is taken from Clerk session data, not from an untrusted client supplied organization value.
* `APP_ORIGIN` is required and fixed to `http://localhost:3000` for this local development phase. Validate `returnTo` before passing it to Clerk's sign in or sign up redirect setting, and again before the final redirect. Accept only a relative path beginning with exactly one `/`; reject protocol relative URLs, schemes, backslashes, control characters, malformed values, or any parsed URL with a different origin. Preserve the path and query across the callback and organization setup, and fall back to `/` when invalid.
* Clerk manages authentication and membership. No local auth records or webhook endpoint are added.
* Organization creation and selection use Clerk's session authenticated client API. Do not rely on the page's rendering gate as authorization for protected server code.
* No special regulatory or data residency requirements were identified for account data.

**Configuration required**:
* `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key used by the app.
* `CLERK_SECRET_KEY`: Clerk secret key used only by server code.
* `APP_ORIGIN`: required app origin used for safe return destination validation; set to `http://localhost:3000` in this phase.

**Critical test scenarios**:
* Happy path: sign in with each configured method, create or select an organization, then load a protected page, verifies **AC-1**, **AC-3**, and **AC-4**
* Failure case: missing or invalid Clerk configuration does not expose a protected page, an external or ambiguous `returnTo` falls back to `/`, and failed activation can be retried without duplicate creation, verifies **AC-2**, **AC-3**, and **AC-9**
* Auth and permission: a signed out visitor cannot load a protected page, and a signed in user without an active organization cannot load app content, verifies **AC-2**, **AC-3**, and **AC-4**
* Return flow: start at a protected URL with a query, sign in, complete organization setup, and confirm the exact pathname and query are restored, verifies **AC-3**
* Route coverage: `/organizations` accepts a signed in user without an active organization, while other app routes and their server actions require both `userId` and `orgId`, verifies **AC-2** and **AC-4**
* Presentation: both auth routes show the agreed two panel layout, Graphcode context, and Clerk's prebuilt component, verifies **AC-8**
* Organization setup: render every membership through Clerk pagination, select an organization, create one inline and explicitly activate it, foreground creation for an empty list, and show retryable loading or Clerk error states, verifies **AC-3**, **AC-4**, **AC-6**, and **AC-9**
* Scope: no local auth records or webhook are added, and the organization controls do not expose invitations or membership changes, verifies **AC-5** and **AC-6**

## Build plan

1. Run Clerk CLI setup with pnpm for an accountless local app at `http://localhost:3000`, review its changes, and keep key values private. Pause for user input if a provider requires app claiming or OAuth credentials, satisfies **AC-1** and **AC-5**
2. Configure public sign in and sign up routes with the agreed two panel layout, the Clerk provider, and protected first request handling using the current Next.js 16 pattern, satisfies **AC-1**, **AC-2**, and **AC-8**
3. Configure GitHub, Google, and email code sign in, require organization membership, and build the paginated organization list and inline creation flow with explicit activation, loading, and retryable error states, satisfies **AC-1**, **AC-3**, **AC-6**, and **AC-9**
4. Add the signed in account menu and limited organization controls using Clerk membership data. Require the correct `userId` and `orgId` checks for each route and server action, carry `returnTo` through sign in and organization setup, and validate it against `APP_ORIGIN`, satisfies **AC-2**, **AC-3**, and **AC-4**
5. Run type checking, lint, and production build, then start the app for the developer's manual browser check, satisfies **AC-7**

## Consequences

**Positive**:
* Graphcode gets a real identity and organization context without owning credentials or session logic.
* The app's first organization flow works without adding a database or copying provider records.
* Access changing member controls stay out until audit storage is ready.

**Negative / tradeoffs**:
* Local development depends on Clerk availability and development configuration.
* Organization invitations cannot be sent or administered from Graphcode yet.
* Custom organization selection behavior requires more app code than exposing the full organization profile.

**Neutral**:
* The Clerk development application and keys are managed outside source control.
* Production keys and provider configuration are not part of this phase.

## Follow-up

* [ ] Add Clerk auth and organization conventions to an app area `AGENTS.md` before implementation, with a root pointer if needed.
* [ ] Design invitation and member management with durable audit storage as part of the database phase.
* [ ] Configure production Clerk settings only after the development application is claimed and a production domain is available.
