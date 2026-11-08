import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppOrigin, getValidatedReturnTo } from "./app/lib/return-to";

function isRouteOrSubpath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default clerkMiddleware(async (auth, request) => {
  const appOrigin = getAppOrigin();
  const { pathname, search } = request.nextUrl;

  if (
    isRouteOrSubpath(pathname, "/sign-in") ||
    isRouteOrSubpath(pathname, "/sign-up")
  ) {
    return;
  }

  const { userId, orgId } = await auth();
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
