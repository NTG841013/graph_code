import { MarketingHeader } from "./marketing-header";
import { IllustrationHero, IllustrationParsing, IllustrationMap, IllustrationFrameworks } from "./illustrations";

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      <MarketingHeader />
      
      <main className="mx-auto max-w-[1140px] px-6">
        {/* Hero */}
        <section className="grid h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] items-center gap-12 overflow-hidden py-12 lg:grid-cols-2">
          <div className="flex flex-col items-start justify-center">
            <h1 className="max-w-[700px] text-5xl font-bold leading-[0.9] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              See the shape of code you didn&apos;t write.
            </h1>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-muted sm:text-lg">
              Paste a public GitHub repository. Graphcode parses every TypeScript 
              and JavaScript file and draws the imports between them. Every line 
              on the map is an import it resolved to a real file.
            </p>
            
            <form action="/analysis/start" method="GET" className="mt-10 flex max-w-md gap-3">
              <input
                name="repoUrl"
                type="url"
                required
                placeholder="github.com/owner/repo"
                className="flex-1 min-h-12 rounded-md border border-border/50 bg-surface/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted/40 focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors focus:bg-background"
              />
              <button
                type="submit"
                className="min-h-12 rounded-md bg-accent px-6 py-3 text-sm font-bold text-accent-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 transition-all uppercase tracking-tight"
              >
                Map repository
              </button>
            </form>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted/50">
              Public repositories only. You sign in first; no GitHub token is asked for.
            </p>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <IllustrationHero />
          </div>
        </section>

        <hr className="border-border/20" />

        <section id="parsing" className="grid min-h-[calc(100vh-4rem)] items-center gap-12 py-24 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              Everything comes from parsing.
            </h2>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-muted">
              We don&apos;t guess connections. Graphcode uses ts-morph to walk your 
              abstract syntax tree, identifying every export and where it&apos;s 
              consumed across your entire project.
            </p>
          </div>
          <div className="flex items-center justify-center lg:justify-end">
            <IllustrationParsing />
          </div>
        </section>

        <hr className="border-border/20" />

        <section id="map" className="grid min-h-[calc(100vh-4rem)] items-center gap-12 py-24 lg:grid-cols-2">
          <div className="order-2 flex items-center justify-center lg:order-1 lg:justify-start">
            <IllustrationMap />
          </div>
          <div className="order-1 flex flex-col justify-center lg:order-2">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              A map you can actually use.
            </h2>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-muted">
              Nodes are files, edges are imports. The layout is calculated using 
              directed acyclic graph logic, revealing the natural hierarchy and 
              hidden circularities in your architecture.
            </p>
          </div>
        </section>

        <hr className="border-border/20" />

        <section id="frameworks" className="grid min-h-[calc(100vh-4rem)] items-center gap-12 py-24 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              Built for the modern stack.
            </h2>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-muted">
              Deep understanding of Next.js, React, and TypeScript. We resolve 
              path aliases, barrel imports, and complex dependency chains that 
              naive grepping misses.
            </p>
          </div>
          <div className="flex items-center justify-center lg:justify-end">
            <IllustrationFrameworks />
          </div>
        </section>

        <hr className="border-border/20" />

        {/* What it doesn't do */}
        <section className="py-24">
          <div className="max-w-[720px]">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              What we don&apos;t do.
            </h2>
            <div className="mt-16 grid gap-12 sm:grid-cols-2">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent/80">No Hallucinations</h3>
                <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-muted">
                  The AI explains what the parser found. It never invents files 
                  or connections that aren&apos;t in the source code.
                </p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent/80">No Persistence</h3>
                <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-muted">
                  We don&apos;t store your code. The parser runs, the map is 
                  generated, and the transient data is discarded.
                </p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent/80">No Configuration</h3>
                <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-muted">
                  No `graphcode.json` required. If your code compiles and 
                  imports work, the map will be accurate.
                </p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent/80">No Noise</h3>
                <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-muted">
                  We omit `node_modules` and library internals by default. 
                  You see your architecture, not your dependencies&apos; baggage.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/20 py-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted/40">
              Graphcode &copy; 2026
            </p>
            <div className="flex gap-8">
              <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-muted/40 hover:text-foreground transition-colors">Documentation</a>
              <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-muted/40 hover:text-foreground transition-colors">GitHub</a>
              <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-muted/40 hover:text-foreground transition-colors">Privacy</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

