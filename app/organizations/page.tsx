import { AppHeader } from "@/app/components/app-header";
import { OrganizationSetup } from "@/app/components/organization-setup";
import { requireSignedInUser } from "@/app/lib/auth";
import { getValidatedReturnTo } from "@/app/lib/return-to";
import { Suspense } from "react";

type OrganizationsPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default function OrganizationsPage({
  searchParams,
}: OrganizationsPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-8 text-sm text-muted">
          Loading organization setup…
        </main>
      }
    >
      <OrganizationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrganizationsContent({
  searchParams,
}: OrganizationsPageProps) {
  const params = await searchParams;
  const returnTo = getValidatedReturnTo(params.returnTo) ?? "/";

  await requireSignedInUser(returnTo);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader returnTo={returnTo} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-6 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Workspace setup
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Choose an organization
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Select an organization you belong to, or create one to continue.
          </p>
        </div>
        <OrganizationSetup returnTo={returnTo} />
      </main>
    </div>
  );
}
