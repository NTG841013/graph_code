import { createElement, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { OrganizationSwitcher } from "@clerk/nextjs";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () =>
    createElement("button", { type: "button", "aria-label": "Account menu" }),
  OrganizationSwitcher: (props: ComponentProps<typeof OrganizationSwitcher>) =>
    createElement("div", {
      "data-testid": "org-switcher",
      "data-hide-personal": props.hidePersonal?.toString(),
      "data-create-url": props.createOrganizationUrl,
    }),
}));

import { AppHeader } from "./app-header";

describe("AppHeader", () => {
  it("AC-1: provides account, theme, and organization switcher", () => {
    render(<AppHeader returnTo="/repo" />);

    expect(screen.getByRole("link", { name: "Graphcode" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Theme" }),
    ).toBeInTheDocument();

    const switcher = screen.getByTestId("org-switcher");
    expect(switcher).toBeInTheDocument();
    expect(switcher).toHaveAttribute("data-hide-personal", "true");
    expect(switcher).toHaveAttribute("data-create-url", "/organizations?returnTo=%2Frepo");
  });
});
