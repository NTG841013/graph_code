import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeControl } from "./theme-control";

type AuthShellProps = {
  children: ReactNode;
  mode: "sign-in" | "sign-up";
  returnTo: string;
};

export function AuthShell({ children, mode, returnTo }: AuthShellProps) {
  const signInUrl = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  const signUpUrl = `/sign-up?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl overflow-hidden rounded-xl border border-border bg-background shadow-sm md:min-h-[calc(100vh-5rem)] md:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between gap-10 bg-surface p-6 sm:p-10">
          <Link
            href="/"
            className="w-fit rounded-sm text-sm font-semibold tracking-wide text-foreground focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Graphcode
          </Link>
          <div className="max-w-md">
            <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-accent">
              Codebase dependencies
            </p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              See how an unfamiliar codebase is connected.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted">
              Sign in with GitHub, paste a public TypeScript or JavaScript
              repository URL, and get a map of it. Folders as boxes, imports as
              lines between them.
            </p>
          </div>
          <p className="font-mono text-xs text-muted">
            Sign in to your organization workspace
          </p>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-6 flex justify-end">
            <ThemeControl />
          </div>
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Graphcode account
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              {mode === "sign-in" ? "Sign in" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {mode === "sign-in"
                ? "Continue to your organization workspace."
                : "Create an account to start using Graphcode with your team."}
            </p>
          </div>
          {children}
          <p className="mt-6 text-center text-xs text-muted">
            {mode === "sign-in" ? (
              <>
                New to Graphcode?{" "}
                <Link
                  href={signUpUrl}
                  className="font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href={signInUrl}
                  className="font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
