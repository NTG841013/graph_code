import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
  redirect: vi.fn((destination: string): never => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { requireOrganization, requireSignedInUser } from "./auth";

describe("authentication guards", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.redirect.mockClear();
  });

  it("AC-6: returns the signed in user id", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1", orgId: null });

    await expect(requireSignedInUser("/repo")).resolves.toBe("user-1");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("AC-2, AC-6: redirects a signed out user to sign in with the return path", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    await expect(
      requireOrganization("/repo/example?view=files"),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in?returnTo=%2Frepo%2Fexample%3Fview%3Dfiles",
    );
  });

  it("AC-2, AC-6: sends a signed in user without an organization to setup", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1", orgId: null });

    await expect(requireOrganization("/repo")).rejects.toThrow(
      "NEXT_REDIRECT:/organizations?returnTo=%2Frepo",
    );
  });

  it("AC-6: returns both identity values when the user has an organization", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1", orgId: "org-1" });
    mocks.clerkClient.mockResolvedValue({
      organizations: {
        getOrganization: vi.fn().mockResolvedValue({ name: "Org 1" }),
      },
    });

    await expect(requireOrganization("/repo")).resolves.toEqual({
      userId: "user-1",
      orgId: "org-1",
      orgName: "Org 1",
    });
  });
});
