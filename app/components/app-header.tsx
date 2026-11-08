import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeControl } from "./theme-control";

type AppHeaderProps = {
  returnTo: string;
};

export function AppHeader({ returnTo }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="rounded-sm text-sm font-semibold tracking-wide text-foreground focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          Graphcode
        </Link>
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
