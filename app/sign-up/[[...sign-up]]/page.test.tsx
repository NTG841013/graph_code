import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderServerComponent } from "@/test-utils/render-server-component";

vi.mock("@clerk/nextjs", () => ({
  SignUp: (props: { forceRedirectUrl: string; signInUrl: string }) =>
    createElement("div", {
      "data-testid": "clerk-sign-up",
      "data-force-redirect-url": props.forceRedirectUrl,
      "data-sign-in-url": props.signInUrl,
    }),
}));

import SignUpPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SignUpPage", () => {
  it("AC-5, AC-9: passes the validated path to Clerk and the sign in link", async () => {
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
    const page = await SignUpPage({
      searchParams: Promise.resolve({
        returnTo: "/repo/example?view=files",
      }),
    });
    const markup = await renderServerComponent(page);
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: markup }} />,
    );

    expect(
      screen.getByRole("heading", { name: "Create your account", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in?returnTo=%2Frepo%2Fexample%3Fview%3Dfiles",
    );
    expect(
      container.querySelector("[data-testid='clerk-sign-up']"),
    ).toHaveAttribute("data-force-redirect-url", "/repo/example?view=files");
  });

  it("AC-5: falls back to the app root for a malformed return path", async () => {
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
    const page = await SignUpPage({
      searchParams: Promise.resolve({ returnTo: "//outside.example" }),
    });
    const markup = await renderServerComponent(page);
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: markup }} />,
    );

    expect(
      container.querySelector("[data-testid='clerk-sign-up']"),
    ).toHaveAttribute("data-force-redirect-url", "/");
  });
});
