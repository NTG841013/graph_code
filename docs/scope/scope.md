# Scope: Graphcode

Graphcode maps the real dependencies in public TypeScript and JavaScript repositories. It helps developers understand unfamiliar code through a parsed dependency map.

**Build approach:** Tracer Bullet (prove a working thread through each needed layer before expanding it).
**Workflow:** GA (verify, test, review, then document after development).

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit. You decide when a feature is done._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Clerk authentication and organization setup | Foundation | done |
| 2 | Organization invitations and member management | 14 | in-progress |
| 3 | Production Clerk configuration | Deferred | planned |

## Foundations

### 1. Clerk authentication and organization setup · done

Provide identity and organization context so signed in users can use the app without personal accounts.
**Done when:** users can sign in, create or select an organization, and reach protected pages only with a valid session and active organization.
* [x] Design it (spec): `/architect Clerk authentication and organization setup`
* [x] Build it: `/develop Clerk authentication and organization setup`
  * [x] Thin end to end Clerk, organization, protected access, and Supabase token path (AC-1, AC-2, AC-3, AC-5, AC-6, AC-7, AC-11)
  * [x] Complete organization and account behavior, including invitation acceptance and retryable errors (AC-3, AC-4, AC-8, AC-9, AC-10)
  * [x] Persisted theme control across all routes (AC-12)
  * [x] Type check, lint, production build, and local startup (AC-13)
* [x] Verify it: `/check verify Clerk authentication and organization setup`
* [x] Test it: `/test Clerk authentication and organization setup`
* [x] Review it (fresh model): `/check review Clerk authentication and organization setup`
* [x] Document it: `/document Clerk authentication and organization setup`

Code: [proxy.ts](../../proxy.ts), [app/](../../app/)

Spec [phase-01](../specs/phase-01.md)

## In progress

### 2. Organization invitations and member management · in-progress

Let organization members manage their profile, members, and invitations in Graphcode.
**Done when:** authorized members can manage invitations and membership changes have durable audit records.
* [x] Design it (spec): `/architect Organization invitations and member management`
* [ ] Build it: `/develop Organization invitations and member management`
  * [ ] Header switcher and Clerk organization profile (AC-1, AC-2, AC-3, AC-4)
  * [ ] Durable audit events, webhook handling, and organization cleanup (AC-5, AC-6, AC-7, AC-8, AC-9, AC-10)
  * [ ] Type check, lint, production build, and manual acceptance (AC-11)
* [ ] Verify it: `/check verify Organization invitations and member management`
* [ ] Test it: `/test Organization invitations and member management`
* [ ] Review it (fresh model): `/check review Organization invitations and member management`
* [ ] Document it: `/document Organization invitations and member management`

Spec [phase-14](../specs/phase-14.md)

## Deferred

* **Production Clerk configuration · needs a decision · from spec phase-01**: Configure the claimed Clerk application for the production domain. **Done when:** production sign in methods work with production keys held only by the hosting environment.
