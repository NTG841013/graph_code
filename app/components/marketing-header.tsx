"use client";

import Link from "next/link";
import { ThemeControl } from "./theme-control";
import { SignInButton, Show } from "@clerk/nextjs";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1140px] items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="rounded-sm text-base font-bold tracking-tighter text-foreground focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          graphcode
        </Link>
        <div className="flex items-center gap-4">
          <ThemeControl />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-xs font-mono uppercase tracking-widest text-muted hover:text-foreground transition-colors cursor-pointer px-3 py-1.5 border border-border/20 rounded-md bg-surface/30">
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link 
              href="/"
              className="text-xs font-mono uppercase tracking-widest text-accent hover:opacity-80 transition-opacity"
            >
              Go to Workspace
            </Link>
          </Show>
        </div>
      </div>
    </header>
  );
}
