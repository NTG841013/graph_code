import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createClient: vi.fn<
    (
      url: string,
      key: string,
      options: { accessToken: () => Promise<string> },
    ) => { created: true }
  >(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { createSupabaseServerClient } from "./server";

describe("createSupabaseServerClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC-11: creates a Supabase client that obtains its access token from Clerk", async () => {
    const getToken = vi.fn().mockResolvedValue("clerk-session-token");
    mocks.auth.mockResolvedValue({ getToken });
    mocks.createClient.mockReturnValue({ created: true });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    await expect(createSupabaseServerClient()).resolves.toEqual({
      created: true,
    });

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "sb_publishable_test",
      expect.objectContaining({ accessToken: expect.any(Function) }),
    );
    const options = mocks.createClient.mock.calls[0]?.[2];
    if (!options) {
      throw new Error("Supabase client options were not provided.");
    }
    await expect(options.accessToken()).resolves.toBe("clerk-session-token");
  });

  it("AC-11: rejects client creation when Supabase configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    await expect(createSupabaseServerClient()).rejects.toThrow(
      "Supabase URL and publishable key must be configured.",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("AC-11: rejects a missing Clerk session token", async () => {
    mocks.auth.mockResolvedValue({
      getToken: vi.fn().mockResolvedValue(null),
    });
    mocks.createClient.mockReturnValue({ created: true });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    await createSupabaseServerClient();

    const options = mocks.createClient.mock.calls[0]?.[2];
    if (!options) {
      throw new Error("Supabase client options were not provided.");
    }
    await expect(options.accessToken()).rejects.toThrow(
      "A Clerk session token is required for Supabase access.",
    );
  });
});
