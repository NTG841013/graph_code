# Verify: Clerk authentication and organization setup

_Steps derived from phase 01 acceptance criteria. `/check verify` can run these, and `/test` can later lock the durable ones._

## UI / manual

- [x] In the Clerk development instance, confirm sign in and sign up offer GitHub, Google, and email verification code, and that Organizations use Membership optional mode. Sign in, then confirm a signed in user without an active organization reaches `/organizations`, while protected routes require a user and active organization. → AC-1, AC-2, AC-6
- [x] Open a protected local path with a query while signed out. Sign in, then create or select an organization. Confirm the same local path and query are restored. Confirm external or malformed return paths fall back to `/`. → AC-3, AC-5
- [x] Confirm the membership list follows Clerk's returned order, uses page size 10, and makes every membership reachable. Try blank and whitespace only names, a valid trimmed name, and a Clerk name constraint failure. Confirm errors preserve the entered name. → AC-3, AC-10
- [x] Select a membership and confirm its organization ID becomes active. Create an organization and confirm Clerk's returned ID becomes active. Simulate activation failure and confirm retry does not create another organization. → AC-3, AC-6, AC-10
- [x] Accept a valid Clerk invitation. Confirm the user follows the normal organization guard and return flow. Confirm Graphcode exposes no invitation sending, member management, or role change controls. → AC-4, AC-8
- [x] Confirm the shared header has the Clerk user menu and limited organization controls. Confirm sign in and sign up use the compact two panel layout. → AC-9
- [x] From authenticated server code, create the Supabase client and confirm Supabase accepts Clerk's standard session token with the authenticated role and active organization claims. Confirm there is no custom JWT template, Supabase Auth cookie session, service role key, or database query in this phase. → AC-7, AC-11
- [x] On sign in, sign up, organization setup, and a protected route, choose system, light, and dark. Reload each route and change the operating system theme. Confirm only system mode follows the operating system. → AC-12

## Commands

- [x] `pnpm exec tsc --noEmit` completes successfully. → AC-13
- [x] `pnpm lint` completes successfully. → AC-13
- [x] `pnpm build` completes successfully. → AC-13
- [x] `pnpm dev` starts the app, and the developer can open it in a browser. → AC-13

## Acceptance-criteria coverage

AC-1 through AC-13 are covered by the manual steps and commands above.
