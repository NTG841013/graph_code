import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";

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

  // Ensure organization exists in Supabase
  const supabase = getSupabaseAdmin();
  await supabase
    .from("organizations")
    .upsert({
      id: orgId,
      name: org.name,
    }, { onConflict: 'id' });

  return { userId, orgId, orgName: org.name };
}
