import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Graphcode",
  description: "Map dependencies in public TypeScript and JavaScript repositories.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-full flex flex-col">
        <Script
          id="theme-strategy"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('graphcode-theme');
                if (theme === 'light' || theme === 'dark' || theme === 'system') {
                  document.documentElement.dataset.theme = theme;
                } else {
                  document.documentElement.dataset.theme = 'system';
                }
              })();
            `,
          }}
        />
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "var(--color-accent)",
              colorPrimaryForeground: "var(--color-accent-foreground)",
              colorBackground: "var(--color-background)",
              colorForeground: "var(--color-foreground)",
              colorMutedForeground: "var(--color-muted)",
              colorBorder: "var(--color-border)",
              colorInput: "var(--color-background)",
              colorInputForeground: "var(--color-foreground)",
              borderRadius: "8px",
              fontFamily: "var(--font-geist-sans)",
            },
            elements: {
              cardBox: "w-full bg-transparent shadow-none",
              card: "shadow-none border border-border bg-surface p-10 w-full rounded-2xl",
              header: { display: "none" },
              headerTitle: { display: "none" },
              headerSubtitle: { display: "none" },
              main: "w-full",
              socialButtonsBlockButton:
                "flex h-[44px] w-full items-center justify-center rounded-lg border border-white/10 bg-background text-sm font-medium text-foreground transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background",
              socialButtonsBlockButtonBadge: { display: "none" },
              formButtonPrimary:
                "h-[44px] w-full rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition-all hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background uppercase tracking-wide",
              formFieldInput:
                "h-[44px] w-full rounded-lg border border-white/10 bg-background px-3 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
              formFieldLabel:
                "font-mono text-[10px] uppercase tracking-widest text-muted mb-1.5",
              dividerLine: "bg-white/10",
              dividerText: "font-mono text-[10px] uppercase text-muted/80 mx-3",
              formFieldAction: "text-accent text-[10px] font-mono uppercase tracking-tight hover:text-accent/80 transition-colors",
              footer: "mt-6",
              footerAction: "justify-start p-0",
              footerActionText: "text-muted text-xs",
              footerActionLink: "text-accent hover:text-accent/80 font-medium transition-colors ml-1",
              internal: { display: "none" },
              identityPreview: { display: "none" },
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}