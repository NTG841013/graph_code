import { AppHeader } from "@/app/components/app-header";
import { requireOrganization } from "@/app/lib/auth";
import { AnalysisList } from "@/app/components/analysis-list";
import { Suspense } from "react";

export default function Home({ 
  searchParams 
}: { 
  searchParams: Promise<{ page?: string }> 
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-10 text-sm font-mono text-muted">
          Loading organization workspace…
        </main>
      }
    >
      <OrganizationHome searchParams={searchParams} />
    </Suspense>
  );
}

async function OrganizationHome({ 
  searchParams 
}: { 
  searchParams: Promise<{ page?: string }> 
}) {
  const { orgName, orgId } = await requireOrganization("/");
  const resolvedSearchParams = await searchParams;
  const pageParam = resolvedSearchParams.page;
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const validPage = isNaN(page) || page < 1 ? 1 : page;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader returnTo="/" />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Workspace
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            {orgName}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Select a repository to view its dependency map, or start a new
            analysis. All data in this workspace belongs to this team.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="mt-8 h-48 border border-border bg-surface/30" />
          }
        >
          <AnalysisList orgName={orgName} page={validPage} />
        </Suspense>

        <footer className="mt-12 border-t border-border/30 pt-4">
          <p className="font-mono text-[10px] text-muted/50 uppercase tracking-tighter">
            Organization ID: {orgId}
          </p>
        </footer>
      </main>
    </div>
  );
}
