import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderServerComponent } from "@/test-utils/render-server-component";

const mocks = vi.hoisted(() => ({
  requireSignedInUser: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireSignedInUser: mocks.requireSignedInUser,
}));

vi.mock("@/app/components/app-header", () => ({
  AppHeader: (props: { returnTo: string }) =>
    createElement("header", {
      "data-testid": "app-header",
      "data-return-to": props.returnTo,
    }),
}));

vi.mock("@/app/components/organization-setup", () => ({
  OrganizationSetup: (props: { returnTo: string }) =>
    createElement("div", {
      "data-testid": "organization-setup",
      "data-return-to": props.returnTo,
    }),
}));

import OrganizationsPage from "./page";

describe("OrganizationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
    mocks.requireSignedInUser.mockResolvedValue("user-1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC-2, AC-3, AC-5: validates and passes the return path to setup", async () => {
    const page = OrganizationsPage({
      searchParams: Promise.resolve({
        returnTo: "/repo/example?view=files",
      }),
    });
    const markup = await renderServerComponent(page);
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: markup }} />,
    );

    expect(
      screen.getByRole("heading", { name: "Choose an organization" }),
    ).toBeInTheDocument();
    expect(mocks.requireSignedInUser).toHaveBeenCalledWith(
      "/repo/example?view=files",
    );
    expect(
      container.querySelector("[data-testid='app-header']"),
    ).toHaveAttribute("data-return-to", "/repo/example?view=files");
    expect(
      container.querySelector("[data-testid='organization-setup']"),
    ).toHaveAttribute("data-return-to", "/repo/example?view=files");
  });

  it("AC-5: falls back to the app root for an external destination", async () => {
    const page = OrganizationsPage({
      searchParams: Promise.resolve({
        returnTo: "https://outside.example",
      }),
    });
    const markup = await renderServerComponent(page);
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: markup }} />,
    );

    expect(mocks.requireSignedInUser).toHaveBeenCalledWith("/");
    expect(
      container.querySelector("[data-testid='organization-setup']"),
    ).toHaveAttribute("data-return-to", "/");
  });
});
