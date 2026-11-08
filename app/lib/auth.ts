import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireSignedInUser(returnTo: string) {
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return userId;
}

export async function requireOrganization(returnTo: string) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (!orgId) {
    redirect(`/organizations?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  return { userId, orgId, orgName: org.name };
}
