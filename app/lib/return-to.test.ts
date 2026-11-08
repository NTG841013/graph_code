import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppOrigin, getValidatedReturnTo } from "./return-to";

describe("getAppOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured local app origin", () => {
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");

    expect(getAppOrigin()).toBe("http://localhost:3000");
  });

  it("rejects a missing or different app origin", () => {
    vi.stubEnv("APP_ORIGIN", "https://graphcode.example");

    expect(() => getAppOrigin()).toThrow(
      "APP_ORIGIN must be set to http://localhost:3000.",
    );
  });
});

describe("getValidatedReturnTo", () => {
  const appOrigin = "http://localhost:3000";

  it("AC-5: preserves a safe local path and query", () => {
    expect(
      getValidatedReturnTo("/repo/example?view=files", appOrigin),
    ).toBe("/repo/example?view=files");
  });

  it.each([
    undefined,
    null,
    42,
    "https://outside.example/path",
    "//outside.example/path",
    "/%2f%2foutside.example/path",
    "/\\outside.example/path",
    "/repo/example#section",
    "/repo/%0Aexample",
    "/repo/%E0%A4%A",
  ])("AC-5: rejects unsafe return destinations: %s", (value) => {
    expect(getValidatedReturnTo(value, appOrigin)).toBeNull();
  });
});
