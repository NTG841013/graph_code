import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  appearance: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: (props: { children: ReactNode; appearance: unknown }) => {
    mocks.appearance(props.appearance);
    return createElement("div", { "data-clerk-provider": "true" }, props.children);
  },
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));

vi.mock("./globals.css", () => ({}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("AC-1, AC-9: provides Clerk around the app with the shared theme tokens", () => {
    const markup = renderToStaticMarkup(
      RootLayout({
        params: Promise.resolve({}),
        children: createElement("main", null, "App content"),
      }),
    );

    expect(markup).toContain('<html lang="en"');
    expect(markup).toContain("App content");
    expect(mocks.appearance).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          colorPrimary: "var(--color-accent)",
          colorBackground: "var(--color-background)",
          colorDanger: "var(--color-danger)",
        }),
      }),
    );
  });

  it("AC-9: publishes Graphcode metadata", () => {
    expect(metadata).toEqual({
      title: "Graphcode",
      description: "Map dependencies in public TypeScript and JavaScript repositories.",
    });
  });
});
