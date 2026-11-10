"use client";

import { useFormStatus } from "react-dom";
import { startAnalysis } from "@/app/lib/actions/analysis";
import { useState } from "react";

export function AnalysisForm() {
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setError(null);
    try {
      await startAnalysis(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="mt-10 max-w-2xl">
      <form action={action}>
        <div className="flex flex-col gap-2">
          <label 
            htmlFor="repoUrl" 
            className="font-mono text-[10px] uppercase tracking-widest text-muted ml-0.5"
          >
            New Analysis
          </label>
          <div className="flex gap-2">
            <input
              id="repoUrl"
              name="repoUrl"
              type="url"
              placeholder="https://github.com/owner/repo"
              required
              className="flex-1 min-h-10 rounded-md border border-border bg-surface/50 px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted/40 focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors focus:bg-background"
            />
            <SubmitButton />
          </div>
          {error && (
            <p className="mt-1 text-[10px] font-mono text-danger px-1" role="alert">
              Error: {error}
            </p>
          )}
        </div>
      </form>
      <p className="mt-3 text-[10px] text-muted/60 font-mono leading-relaxed px-1">
        Enter a public GitHub repository URL. We&apos;ll parse the code, resolve imports, 
        and build a dependency map. No private repositories or tokens required.
      </p>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-10 rounded-md bg-accent px-5 py-2 text-xs font-bold text-accent-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all uppercase tracking-tight"
    >
      {pending ? "Starting…" : "Analyze"}
    </button>
  );
}
