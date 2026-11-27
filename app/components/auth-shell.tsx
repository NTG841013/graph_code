import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeControl } from "./theme-control";
import { Copyright } from "./copyright";
import { IllustrationHero } from "./illustrations";

type AuthShellProps = {
  children: ReactNode;
  mode: "sign-in" | "sign-up";
  returnTo: string;
};

export function AuthShell({ children, mode, returnTo }: AuthShellProps) {
  const signInUrl = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  const signUpUrl = `/sign-up?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-col w-full flex-1 md:grid md:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden flex-col overflow-hidden bg-surface p-10 md:flex">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.25] pointer-events-none">
            <div className="w-[800px] shrink-0">
              <IllustrationHero nodeFill="var(--background)" />
            </div>
          </div>

          <Link
            href="/"
            className="relative z-20 w-fit rounded-sm text-sm font-semibold tracking-wide text-foreground focus-visible:outline"
          >
            Graphcode
          </Link>

          <div className="relative z-10 flex flex-1 flex-col justify-center">
            <div className="max-w-[440px]">
              <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-widest text-accent">
                Codebase dependencies
              </p>
              <h1 className="text-4xl font-bold leading-[0.9] tracking-[-0.05em] lg:text-5xl">
                See how an unfamiliar codebase is connected.
              </h1>
              <p className="mt-6 text-base leading-relaxed text-muted">
                Sign in with GitHub, paste a public TypeScript or JavaScript
                repository URL, and get a map of it. Folders as boxes, imports as
                lines between them.
              </p>
            </div>
          </div>

          <div className="relative z-20 text-[10px] font-mono uppercase tracking-widest text-muted/50">
            © <Copyright /> Graphcode
          </div>
        </section>

        <section className="flex flex-col px-6 py-10 sm:px-10">
          <div className="mb-12 flex items-center justify-between">
            <Link
              href="/"
              className="rounded-sm text-sm font-semibold tracking-wide text-foreground focus-visible:outline md:hidden"
            >
              Graphcode
            </Link>
            <div className="ml-auto">
              <ThemeControl />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Graphcode account
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                {mode === "sign-in" ? "Sign in" : "Create account"}
              </h2>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
