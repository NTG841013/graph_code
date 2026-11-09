import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderServerComponent } from "@/test-utils/render-server-component";

const mocks = vi.hoisted(() => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireOrganization: mocks.requireOrganization,
}));

vi.mock("@/app/components/app-header", () => ({
  AppHeader: (props: { returnTo: string }) =>
    createElement("header", {
      "data-testid": "app-header",
      "data-return-to": props.returnTo,
    }),
}));

vi.mock("@/app/components/analysis-list", () => ({
  AnalysisList: () => createElement("div", { "data-testid": "analysis-list" }),
}));

import Home from "./page";

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOrganization.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("AC-2, AC-6: requires an active organization before showing its workspace", async () => {
    const searchParams = Promise.resolve({ page: "1" });
    const markup = await renderServerComponent(
      createElement(Home, { searchParams }),
    );
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: markup }} />,
    );

    expect(mocks.requireOrganization).toHaveBeenCalledWith("/");
    expect(screen.getByText(/Organization ID:/)).toBeInTheDocument();
    expect(screen.getByText(/org-1/)).toBeInTheDocument();
    expect(container.querySelector("[data-testid='app-header']")).toHaveAttribute(
      "data-return-to",
      "/",
    );
  });
});
