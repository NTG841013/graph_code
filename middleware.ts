import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppOrigin, getValidatedReturnTo } from "./app/lib/return-to";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/agent/tools(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;
  
  if (isPublicRoute(request)) {
    return;
  }

  const { userId, orgId } = await auth();
  const appOrigin = getAppOrigin();
  const returnTo = getValidatedReturnTo(`${pathname}${search}`, appOrigin) ?? "/";

  if (!userId) {
    const signInUrl = new URL("/sign-in", appOrigin);
    signInUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname === "/organizations") {
    return;
  }

  if (!orgId) {
    const organizationsUrl = new URL("/organizations", appOrigin);
    organizationsUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(organizationsUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
