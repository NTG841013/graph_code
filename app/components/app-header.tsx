import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeControl } from "./theme-control";

type AppHeaderProps = {
  returnTo: string;
  aiStatus?: { configured: boolean; tracing: boolean };
};

export function AppHeader({ returnTo, aiStatus }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-sm text-sm font-semibold tracking-wide text-foreground focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Graphcode
          </Link>
          
          {aiStatus && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full border border-border bg-surface/30 font-mono text-[9px] uppercase tracking-tighter">
              <span className={`w-1 h-1 rounded-full ${aiStatus.configured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={aiStatus.configured ? 'text-foreground/60' : 'text-red-500/60'}>AI</span>
              <span className="text-border">|</span>
              <span className={`w-1 h-1 rounded-full ${aiStatus.tracing ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-foreground/60">Traced</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeControl />
          <OrganizationSwitcher
            hidePersonal
            organizationProfileMode="modal"
            createOrganizationMode="navigation"
            createOrganizationUrl={`/organizations?returnTo=${encodeURIComponent(returnTo)}`}
            afterSelectOrganizationUrl={returnTo}
          />
          <UserButton />
        </div>
      </div>
    </header>
  );
}
