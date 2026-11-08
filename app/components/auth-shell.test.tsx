import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "./auth-shell";

describe("AuthShell", () => {
  it("AC-9: renders the sign in panel and keeps the sign up return path", () => {
    render(
      <AuthShell mode="sign-in" returnTo="/repo/example?view=files">
        <div>Clerk sign in</div>
      </AuthShell>,
    );

    expect(
      screen.getByRole("heading", { name: "Sign in", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute(
      "href",
      "/sign-up?returnTo=%2Frepo%2Fexample%3Fview%3Dfiles",
    );
    expect(screen.getByText("Clerk sign in")).toBeInTheDocument();
  });

  it("AC-9: renders the sign up panel and links back with the same return path", () => {
    render(
      <AuthShell mode="sign-up" returnTo="/repo/example?view=files">
        <div>Clerk sign up</div>
      </AuthShell>,
    );

    expect(
      screen.getByRole("heading", { name: "Create your account", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in?returnTo=%2Frepo%2Fexample%3Fview%3Dfiles",
    );
    expect(screen.getByText("Clerk sign up")).toBeInTheDocument();
  });
});
