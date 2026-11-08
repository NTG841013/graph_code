# Graphcode

Graphcode maps dependencies in public TypeScript and JavaScript repositories.

## Local setup

The app uses Clerk for sign in and organization access. Keep the Clerk secret
key in `.env.local`, and set the local app origin there:

```env
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Before manual verification, check that the Clerk development instance offers
GitHub, Google, and email verification code sign in, and uses Membership
optional mode. If enabling a sign in method requires claiming the app or adding
OAuth credentials, stop and resolve that outside this code change. Connect the
Clerk instance to Supabase and register Clerk as a Supabase third party auth
provider in the Supabase project settings.

The Clerk development keys are provisioned by the Clerk CLI and must not be
committed. Organizations must be enabled on the development instance.

Run the app with:

```powershell
pnpm dev
```
