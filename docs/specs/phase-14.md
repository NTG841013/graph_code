# Phase 14: Organization invitations and member management

**Date**: 2026-11-08
**Status**: In Progress

## Summary

Organization members can manage their team through Clerk’s existing profile interface in Graphcode. Clerk remains the source of truth for members, roles, and invitations. A signed Clerk webhook records successful membership and invitation changes in Supabase, where the history stays private and is removed with the organization.

## Context

Graphcode already uses Clerk for organization identity and membership, and has a custom organization selector and setup flow. The shared header does not yet expose member management. The supplied screenshots show Clerk’s General and Members interface, including profile changes, invitations, role changes, member removal, leaving, and organization deletion.

The application has no local membership source of truth. Audit history must therefore follow changes made through Graphcode and other Clerk surfaces. Clerk delivers these events asynchronously. Its documented membership events include the resulting role but do not promise an initiating user, so the actor cannot always be known. Graphcode has no data tables yet, so this phase has no Graphcode rows to remove. Future organization owned tables must be included in organization deletion before they are used.

## Requirements

**User stories**:
- As an organization admin, I want to manage the organization profile, members, and invitations so I can keep my team current.
- As an organization member, I want to see the member list and leave the organization when needed.
- As a Graphcode operator, I want successful membership and invitation changes recorded durably so that the organization has a change history.

**Acceptance criteria**:
- **AC-1**: The shared header uses Clerk’s `OrganizationSwitcher` instead of the current custom selector. Organization selection returns to the validated destination. The create action navigates to the existing `/organizations` setup flow with its validated destination, preserving its creation and retry behavior. Personal accounts are hidden. The switcher opens the organization profile in a modal.
- **AC-2**: The organization profile shows General and Members. General allows profile updates, leaving, and organization deletion. Members shows members and invitations. Admins can invite, review and cancel invitations, change roles, and remove members. Regular members can view the member list and leave. Billing, verified domains, security, and membership request features remain disabled.
- **AC-3**: Clerk’s default `org:admin` and `org:member` roles remain in use. Only admins can manage members and invitations. Invitations default to `org:member`; an admin can choose `org:admin`.
- **AC-4**: Invitation acceptance continues through Clerk’s standard flow and the existing sign in, active organization, and validated return flow.
- **AC-5**: A Clerk webhook records successful organization invitation creation, acceptance, and revocation, and membership creation, update, and deletion. It records changes made through Graphcode and other Clerk surfaces. Recording begins when the webhook is configured. The audit history is not backfilled.
- **AC-6**: Each audit row stores the Clerk event ID, organization ID, event type, event time, actor ID when supplied, affected user ID when supplied, invitation ID and email when supplied, and resulting role when supplied. The previous role is not required. Raw webhook payloads and failed or denied attempts are not stored.
- **AC-7**: Webhook events are processed asynchronously. Repeated delivery of the same Clerk event creates only one audit row. Invalid signatures are rejected. A database failure returns an error so Clerk can retry. The event time, not delivery order, determines the recorded time.
- **AC-8**: Audit rows remain for the lifetime of the organization and are removed when the organization is deleted. A private deletion marker keeps only the organization ID, deletion event ID, and deletion time, so delayed or repeated events cannot recreate deleted history. This phase has no Graphcode data tables to clean up. When organization owned tables are added, their rows must also be removed as part of organization deletion.
- **AC-9**: The audit table has row level security enabled and grants no client read or write access. There is no audit history screen. A server side webhook handler is the only writer and uses a server only Supabase service role key. The key is never sent to the browser.
- **AC-10**: Clerk remains responsible for authorization and enforcement of its own management rules. Graphcode does not promise that an organization always retains an admin. This accepts the limitation of the prebuilt profile.
- **AC-11**: Type checking, lint, and the production build pass. Manual browser checks confirm organization switching, creation, management, invitation acceptance, member actions, and the protected route behavior.

## Options considered

### Option 1: Clerk’s organization profile with webhook audit

Use Clerk’s `OrganizationSwitcher` and its embedded `OrganizationProfile` modal. Use signed Clerk webhooks to write normalized change records to Supabase.

**Pros**:
- Matches the supplied screenshots and keeps membership operations with Clerk.
- Captures changes made outside Graphcode as well as changes from its interface.
- Avoids a second membership model and custom invitation flows.

**Cons**:
- Webhook records arrive after the Clerk action and can be delayed.
- Clerk does not document an initiating user for every event.
- Graphcode cannot enforce additional rules, such as retaining one admin, inside the prebuilt profile.

### Option 2: Custom Graphcode member management

Build member and invitation screens and route each change through Graphcode server code before writing an audit row.

**Pros**:
- Graphcode can record the signed in actor and enforce custom membership rules.
- The interface can expose only the actions Graphcode chooses.

**Cons**:
- Changes made through other Clerk surfaces would be missed unless a webhook system were also added.
- Graphcode would own more membership behavior and error handling than the project needs.

## Decision

**Chosen option**: Option 1: Clerk’s organization profile with webhook audit

Use Clerk’s built in organization switcher and profile modal, with a signed webhook writing normalized, deduplicated audit events to Supabase.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) and `supabase-postgres-best-practices` (`supabase/agent-skills`, `.agents/skills/supabase-postgres-best-practices/`)

## Rationale

Clerk already owns organization membership and roles, and its profile component matches the supplied interface. A custom management screen would duplicate provider behavior and could not observe changes made elsewhere without the same webhook integration. The webhook adds a small asynchronous path for the durable history without creating a local membership system.

The engineer chose the prebuilt profile and accepted that Clerk does not guarantee a remaining admin or provide an actor for every event. Audit rows therefore record the affected membership or invitation and resulting role, with a nullable actor. A webhook retry can delay the history, but an event ID prevents duplicate rows.

## Feature design

**Data model sketch**:

`organization_audit_events` is an append only table keyed by Clerk’s `svix-id` event header:

- `event_id text primary key`, required, unique identifier for a Clerk delivery event.
- `organization_id text not null`, required, Clerk organization ID and tenant key.
- `event_type text not null`, required, one of the supported invitation or membership event types.
- `occurred_at timestamptz not null`, required, Clerk event timestamp.
- `received_at timestamptz not null`, required, database receipt time.
- `actor_user_id text`, nullable, present only when supplied in the event.
- `subject_user_id text`, nullable, affected member when supplied.
- `membership_id text`, nullable, affected Clerk membership when supplied.
- `invitation_id text`, nullable, affected invitation when supplied.
- `invited_email text`, nullable, invitation email when supplied.
- `role text`, nullable, resulting role when supplied.

Do not store raw payloads or previous roles. Add an index on `(organization_id, occurred_at desc)` for organization scoped history and enable row level security.

`deleted_organizations` is a private operational table keyed by `organization_id text primary key`. It also stores the deletion event ID and event time. Retain this minimal marker after deleting audit rows, so delayed events cannot recreate history for a deleted organization.

**Event field mapping**:

| Clerk event | Organization ID | Subject or membership | Invitation | Email | Role | Event time |
|---|---|---|---|---|---|---|
| `organizationInvitation.created` and `organizationInvitation.revoked` | `data.organization_id` | None | `data.id` | `data.email_address` | `data.role` | Envelope `timestamp` |
| `organizationInvitation.accepted` | `data.organization_id` | `data.user_id` | `data.id` | `data.email_address` | `data.role` | Envelope `timestamp` |
| `organizationMembership.created`, `organizationMembership.updated`, and `organizationMembership.deleted` | `data.organization.id` | `data.public_user_data.user_id` when present; `data.id` is the membership ID | None | None | `data.role` | Envelope `timestamp` |
| `organization.deleted` | `data.id` | Not stored | Not stored | Not stored | Not stored | Envelope `timestamp` |

For every event, `event_id` comes from the `svix-id` request header and `event_type` from the envelope `type`. The supported event schemas do not provide an initiating user, so `actor_user_id` is null for these events. Convert the envelope timestamp from milliseconds to `timestamptz`.

**State transitions**:

- Invitation: `pending` → `accepted` or `revoked`, as reported by Clerk.
- Membership: `created` → `updated` → `deleted`, as reported by Clerk.
- Audit event: absent → inserted once. The event ID makes retries idempotent. Events are ordered by Clerk event time, not arrival time.
- Organization: active → deleted. Store the deletion marker and remove the organization's audit rows in one database transaction. Every event writer and deletion uses the same organization lock. Late events for a deleted organization are acknowledged and ignored. Future organization owned tables must join this cleanup before they are used.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Clerk organization switcher and profile | Clerk component operations | Active organization from Clerk; member or invitation action from the signed in admin | Updated Clerk organization, membership, or invitation state | Clerk session and organization role | Clerk validation or permission error |
| `/api/webhooks/clerk` | POST | Clerk event body and Svix signature headers | `204` for accepted, duplicate, or late events | Verified Clerk webhook signature | `401` invalid signature; `400` malformed event; `500` database failure for retry |
| `record_clerk_org_event` | Postgres RPC | Normalized event, `svix-id`, and organization ID | Recorded, duplicate, or ignored result | `service_role` only | Transaction failure returns an error to the webhook route |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Switch or create an organization | Active organization ID and destination | Clerk component result and the existing validated return destination |
| Display organization members | Member identity, joined date, and role | Clerk organization membership data |
| Display and manage invitations | Email, invitation state, and role | Clerk organization invitation data |
| Record a change | Event ID, type, organization, event time, affected member or invitation, and resulting role | `svix-id`, envelope `type` and `timestamp`, and the event specific fields in the Event field mapping |
| Record an actor | Actor user ID or no value | Clerk webhook data when supplied |
| Remove organization audit history | Organization ID and deletion time | `data.id` and envelope `timestamp` from `organization.deleted` |

**Key invariants**:

- Clerk is the only source of truth for memberships, roles, and invitations.
- Only Clerk admins manage membership and invitations. Regular members can view the list and leave.
- Invitation role defaults to `org:member`; only an admin may choose `org:admin`.
- Event IDs are unique. Processing the same event again never creates a second audit row.
- Each supported Clerk event maps only the fields listed in the Event field mapping. Missing optional fields remain null.
- Audit rows contain only normalized event facts and remain private to server code.
- A profile change, invitation, or membership action succeeds in Clerk independently of the asynchronous audit delivery.
- Audit history starts at webhook setup. No historical events are fabricated.
- Organization deletion removes audit rows for that organization. This phase has no Graphcode data tables. Any future organization owned table must be included in cleanup before use.
- A retained deletion marker prevents late or repeated webhook events from recreating deleted rows.
- The prebuilt profile has no added last admin safeguard.

**Security model**:

Clerk enforces profile access using the active organization and its default roles. Supabase row level security is enabled on both audit tables, and `anon` and `authenticated` clients receive no table access or read policy. The webhook handler verifies Clerk’s Svix signature before calling `record_clerk_org_event`. The RPC runs as `SECURITY INVOKER`, and execution is granted only to `service_role`. It takes a transaction scoped advisory lock for the organization, serializes event processing, writes deletion markers, and removes audit rows in one transaction. Future organization owned tables must be added to this cleanup before they are used. The service key is server only and is not used by browser requests. Audit records are not exposed through a Graphcode read path.

Invitation email addresses are personal data. They are retained only while the organization exists and are deleted with its audit history. No other compliance requirement was specified.

**Configuration required**:
- `CLERK_WEBHOOK_SIGNING_SECRET`: verifies incoming Clerk webhook signatures.
- `SUPABASE_SERVICE_ROLE_KEY`: server only key used by the verified webhook handler for audit inserts and audit cleanup.
- Configure a Clerk webhook endpoint for invitation creation, acceptance, and revocation; membership creation, update, and deletion; and organization deletion.

**Critical test scenarios**:
- Admin invites a member, reviews and cancels an invitation, changes a role, and removes a member. Each successful provider event is recorded once, verifies **AC-2**, **AC-3**, **AC-5**, and **AC-6**.
- A member sees the member list and cannot manage invitations or another member. The member can leave, verifies **AC-2** and **AC-3**.
- A repeated webhook event does not create a second row. An invalid signature is rejected, and a database failure allows Clerk to retry, verifies **AC-7** and **AC-9**.
- A delayed membership event after organization deletion is acknowledged and ignored. Deleting an organization removes its audit rows and keeps its minimal deletion marker. No Graphcode data tables exist in this phase, verifies **AC-7**, **AC-8**, and **AC-9**.
- Each supported invitation, membership, and organization deletion event maps the exact fields in the Event field mapping. Missing optional fields remain null, verifies **AC-5**, **AC-6**, and **AC-8**.
- Invitation acceptance returns through the existing protected route and organization flow, verifies **AC-4**.
- Organization selection and creation still return to the validated destination, and the profile shows only General and Members, verifies **AC-1** and **AC-2**.

## Build plan

1. Replace the header organization control with Clerk’s `OrganizationSwitcher`, configure the profile modal and allowed sections, route organization creation to the existing setup flow, and preserve validated return paths, satisfies **AC-1**, **AC-2**, **AC-3**, and **AC-4**.
2. Create the audit table with its event ID constraint, organization and time index, and locked down row level security. Add a verified webhook route and prove one real event reaches Supabase without duplicate rows, satisfies **AC-5**, **AC-6**, **AC-7**, and **AC-9**.
3. Add every event in the Event field mapping, normalize only its named fields, handle nullable values, and use the database transaction and deletion marker to make cleanup safe against duplicate and late delivery, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, and **AC-10**.
4. Run type checking, lint, production build, and the manual browser checks for the organization profile, invitation acceptance, role restrictions, and organization deletion, satisfies **AC-11**.

## Consequences

**Positive**:
- Members and invitations stay managed by Clerk, with no second membership database.
- Changes from Clerk surfaces outside Graphcode are included in the audit history.
- Duplicate webhook delivery does not duplicate audit records.

**Negative / tradeoffs**:
- Audit history is eventually consistent, not part of the user action transaction.
- Some records will not identify the initiating user.
- The prebuilt profile does not enforce Graphcode specific membership rules, including a last admin safeguard.
- The webhook needs a signing secret and a privileged Supabase key, so its server boundary must remain narrow.
- The deletion marker retains an organization ID and deletion time after its audit history is removed, to reject delayed events safely.

**Neutral**:
- Audit history is private storage only, with no user facing history screen.
- The Clerk webhook must be configured for each environment.

## Follow-up

- [ ] Add the `supabase` skill conventions to root `AGENTS.md` before implementation. They are not listed in the project context.
- [ ] Add the `supabase-postgres-best-practices` skill conventions to root `AGENTS.md` before implementation. They are not listed in the project context.
