# Graphcode

A local app that reads a public GitHub repo and draws it as a dependency map.
Everything on screen comes from really parsing the code. The AI explains what
the parser found, it never decides what's there.

Why any of these rules exist is in `docs/project-doc.md`. This file is the
rules themselves.

## Stack

Next.js 16 App Router, React 19, TypeScript strict. ts-morph for parsing. React
Flow and dagre for the map. Clerk for sign-in and organizations. Supabase for
Postgres, row-level security and realtime. The OpenAI SDK through one wrapped
client, traced with LangSmith. Tailwind v4. pnpm.

Next.js 16 changed a lot. If you're not certain about an API, read the docs
inside the installed package rather than going from memory.

## How we work

Spec driven. Nothing gets built without a spec.

**Build approach:** Tracer Bullet (prove a working thread through each needed layer before expanding it).

- `docs/project-doc.md` — what this app is and every decision behind it. Read
  the part you need. Don't ask me to paste it.
- `docs/specs/phase-NN.md` — one per phase, written just before it starts.
  Behaviour and an acceptance check, never filenames.
- This file — always true, read on every prompt.

**Starting a phase.** Read this file and that phase's spec. Build what the spec
asks and stop.

**Dropped into a fresh context and don't know where we are?** Look at which
files exist in `docs/specs/`, then the git log. The last commit is the last
phase that passed. Tell me what you've worked out before building on it.

**The acceptance check is mine to run, not yours.** It's a list of things I do
by hand in a browser. Don't automate it, don't install a test runner or browser
driver for it. Build so those things are true, then tell me it's ready.

**What you check before saying a phase is done:** types, lint, build. Anything
verifiable from a terminal in a few seconds is yours — running a script and
reading its output counts. Anything needing a browser is mine.

**When a phase comes out wrong, I reset rather than patch.** Prompting on top of
wrong code three times leaves code nobody understands, including you. So if a
spec is ambiguous, say so _before_ you build.

## How to talk to me

Short. If a sentence isn't telling me something I need, cut it.

**Ask with an answer attached.** One specific question, and say which way you'd
go and why. "A or B, I'd take B because it keeps the parser standalone" is
answerable in two seconds. An open question isn't. Never pick a direction
silently, never build both.

**When you need something only I can give you** — a key, a token, a value in
`.env.local` — say exactly what and exactly where, then stop.

**No walls of text.** Don't summarise every file you touched or restate the plan
back to me. When a phase is done, say what it does and what the check should
show, in a few lines.

**Plain English.** If you're reaching for a bulleted breakdown of something
that's one sentence, it's one sentence.

**Say when something didn't work.** A failure worked around quietly costs me an
hour later.

## How the code is laid out

You pick the file structure. These are about behaviour.

- **The parsing code can't import Next, React or the database client.** Path in,
  data out, runnable from a plain script.
- **No framework checks inside the parser.** That knowledge lives in an adapter.
- **Graph calculations are pure functions** over a file list and an edge list.
- **Database access happens in server code**, not inside components.
- **Who may read a row is decided by a policy**, never by application code. If a
  query needs a `where` clause to return the right rows, the policy is wrong.
- **One place constructs the AI client.** Anywhere else silently skips tracing.

## Conventions

Strict TypeScript, no `any`. If a type is genuinely awkward, tell me rather than
casting.

Comment the decisions, not the syntax.

Every AI call has a cache read inside its trace, so a cache hit shows up as a
recorded run with no model call in it.

One obvious way to do something beats a configurable one.

The UI is a dense developer tool. Small type, tight spacing, monospace for file
paths. Colour means something or isn't there. Nothing moves unless it was
clicked.

There's a frontend design skill that activates on its own for UI work. Use it,
but the paragraph above overrules it — it will reach for motion, depth and big
type, and this is a tool someone stares at for an hour.

- Design system: build UI to `design.md` for art direction; token values live
  in `app/globals.css`.

## Things not to do

Breaking one of these is worse than not finishing.

- **Never decide that two files are connected.** An edge exists because the
  parser resolved a real import to a real file. Unresolved gets reported with a
  reason, never guessed.
- **Never invent something to fill a gap.** Skipped file? Say so and count it.
  Route not fully recoverable? Show none. Absent beats approximate.
- **Don't install a package without asking.** Name it, say what for, wait.
- **Don't build ahead of the current phase.** No scaffolding for what's coming.
- **Don't grade the code.** No scores, ratings, severity or "issues found". This
  explains a codebase, it doesn't review one.
- **Don't leave the build broken.** Tell me about a failure instead of working
  around it.
- **Don't weaken a check to make it pass.** A check that can't run has to fail
  loudly.
- **Don't read from the database on a loop.** Name your columns, limit list
  reads, subscribe instead of polling.

## Supabase conventions

Database access stays in server code. Never send the `service_role` key to the
browser or store it in a `NEXT_PUBLIC_` variable.

Enable row level security on every table in an exposed schema. Grant only the
permissions the server path needs.

Use `SECURITY INVOKER` for database functions unless the spec explicitly
requires otherwise. Revoke default execution from `PUBLIC`, `anon`, and
`authenticated` when a function is server only.

Verify each webhook signature before writing. Store only normalized fields, use
the event ID for idempotency, and return a failure when persistence fails so
the provider can retry.

### Security & RLS

- Use `TO authenticated` or `TO anon` on policies instead of `auth.role()`.
- Combine `TO authenticated` with an ownership predicate in `USING`.
- `UPDATE` policies require both `USING` (for selection) and `WITH CHECK` (for the result).
- Store authorization data in `app_metadata`, never in `user_metadata`.

### Schema & Queries

- Use lowercase snake_case for all identifiers (tables, columns, functions).
- Every table must have a primary key.
- Index foreign key columns to prevent full table scans on joins/deletes.
- Use `timestamptz` for all timestamps to ensure consistent time zone handling.
- Use `text` instead of `varchar(n)` unless a hard limit is a business rule.
