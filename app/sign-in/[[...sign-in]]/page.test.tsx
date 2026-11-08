import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderServerComponent } from "@/test-utils/render-server-component";

vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: { forceRedirectUrl: string; signUpUrl: string }) =>
    createElement("div", {
      "data-testid": "clerk-sign-in",
      "data-force-redirect-url": props.forceRedirectUrl,
      "data-sign-up-url": props.signUpUrl,
    }),
}));

import SignInPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SignInPage", () => {
  it("AC-5, AC-9: passes the validated path to Clerk and the sign up link", async () => {
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
    const page = await SignInPage({
      searchParams: Promise.resolve({
        returnTo: "/repo/example?view=files",
      }),
    });
    const markup = await renderServerComponent(page);
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: markup }} />,
    );

    expect(
      screen.getByRole("heading", { name: "Sign in", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/sign-up?returnTo=%2Frepo%2Fexample%3Fview%3Dfiles",
    );
    expect(
      container.querySelector("[data-testid='clerk-sign-in']"),
    ).toHaveAttribute("data-force-redirect-url", "/repo/example?view=files");
  });

  it("AC-5: falls back to the app root for an external return path", async () => {
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
    const page = await SignInPage({
      searchParams: Promise.resolve({ returnTo: "https://outside.example" }),
    });
    const markup = await renderServerComponent(page);
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: markup }} />,
    );

    expect(
      container.querySelector("[data-testid='clerk-sign-in']"),
    ).toHaveAttribute("data-force-redirect-url", "/");
  });
});
