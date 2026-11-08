import { AppHeader } from "@/app/components/app-header";
import { requireOrganization } from "@/app/lib/auth";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-10 text-sm text-muted">
          Loading your organization workspace…
        </main>
      }
    >
      <OrganizationHome />
    </Suspense>
  );
}

async function OrganizationHome() {
  const { orgId, orgName } = await requireOrganization("/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader returnTo="/" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Organization workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {orgName}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Your session has an active organization. Graphcode will keep its work
          in this organization.
        </p>
        <p className="mt-6 font-mono text-xs text-muted">
          Active organization ID: <span className="text-foreground">{orgId}</span>
        </p>
      </main>
    </div>
  );
}
