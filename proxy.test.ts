import type { ClerkMiddlewareAuth } from "@clerk/nextjs/server";
import { NextRequest, type NextFetchEvent } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MiddlewareHandler = (
  auth: ClerkMiddlewareAuth,
  request: NextRequest,
  event: NextFetchEvent,
) => Promise<Response | undefined>;

const auth = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: MiddlewareHandler) => handler,
}));

import proxy from "./proxy";

async function runMiddleware(
  path: string,
  identity: { userId: string | null; orgId: string | null },
): Promise<Response | undefined> {
  const request = new NextRequest(`http://localhost:3000${path}`);
  auth.mockResolvedValue(identity);
  const response: unknown = await Reflect.apply(proxy, undefined, [
    auth,
    request,
    undefined,
  ]);

  if (response === undefined || response instanceof Response) {
    return response;
  }

  throw new Error("Middleware returned an unsupported response.");
}

describe("Clerk middleware route protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC-2, AC-5: redirects signed out visitors with their local path and query", async () => {
    const response = await runMiddleware("/repo/example?view=files", {
      userId: null,
      orgId: null,
    });

    if (!response) {
      throw new Error("Expected middleware to redirect.");
    }
    const signInUrl = new URL(response.headers.get("location") ?? "");
    expect(signInUrl.pathname).toBe("/sign-in");
    expect(signInUrl.searchParams.get("returnTo")).toBe(
      "/repo/example?view=files",
    );
  });

  it("AC-2, AC-6: redirects signed in visitors without an organization to setup", async () => {
    const response = await runMiddleware("/repo", {
      userId: "user-1",
      orgId: null,
    });

    if (!response) {
      throw new Error("Expected middleware to redirect.");
    }
    const organizationsUrl = new URL(response.headers.get("location") ?? "");
    expect(organizationsUrl.pathname).toBe("/organizations");
    expect(organizationsUrl.searchParams.get("returnTo")).toBe("/repo");
  });

  it("AC-2, AC-6: lets an authenticated user reach organization setup without an active organization", async () => {
    await expect(
      runMiddleware("/organizations", { userId: "user-1", orgId: null }),
    ).resolves.toBeUndefined();
  });

  it("AC-2: lets signed out visitors reach sign in without invoking auth", async () => {
    await expect(
      runMiddleware("/sign-in", { userId: null, orgId: null }),
    ).resolves.toBeUndefined();

    expect(auth).not.toHaveBeenCalled();
  });

  it("AC-2, AC-6: allows protected routes only when the session and organization are present", async () => {
    await expect(
      runMiddleware("/repo", { userId: "user-1", orgId: "org-1" }),
    ).resolves.toBeUndefined();
  });
});
