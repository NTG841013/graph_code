import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeControl } from "./theme-control";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeControl", () => {
  it("AC-12: persists the selected theme and applies it to the root element", async () => {
    const user = userEvent.setup();
    render(<ThemeControl />);

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(window.localStorage.getItem("graphcode-theme")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("AC-12: restores a saved theme after the control mounts", async () => {
    window.localStorage.setItem("graphcode-theme", "light");
    render(<ThemeControl />);

    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toHaveClass("text-foreground");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("AC-12: falls back to system mode for an unsupported saved value", async () => {
    window.localStorage.setItem("graphcode-theme", "invalid");
    render(<ThemeControl />);

    expect(
      screen.getByRole("button", { name: "Switch to system theme" }),
    ).toHaveClass("text-foreground");
    expect(document.documentElement).toHaveAttribute("data-theme", "system");
  });
});
