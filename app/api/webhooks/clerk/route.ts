import { createSupabaseAdminClient } from "@/app/lib/supabase/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import {
  WebhookEvent,
  OrganizationInvitationJSON,
  OrganizationMembershipJSON,
  OrganizationJSON,
  DeletedObjectJSON,
} from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error("CLERK_WEBHOOK_SIGNING_SECRET must be configured.");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(SIGNING_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as unknown as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  const eventType = evt.type;
  const eventData = evt.data;
  const eventId = svix_id;
  // Clerk event envelope timestamp is in milliseconds
  const occurredAt = new Date(evt.timestamp ?? Date.now()).toISOString();

  let organizationId: string | null = null;
  let subjectUserId: string | null = null;
  let membershipId: string | null = null;
  let invitationId: string | null = null;
  let invitedEmail: string | null = null;
  let role: string | null = null;
  let organizationName: string | null = null;

  switch (eventType) {
    case "organizationInvitation.created":
    case "organizationInvitation.revoked": {
      const data = eventData as OrganizationInvitationJSON;
      organizationId = data.organization_id;
      invitationId = data.id;
      invitedEmail = data.email_address;
      role = data.role;
      break;
    }
    case "organizationInvitation.accepted": {
      const data = eventData as OrganizationInvitationJSON & { user_id: string };
      organizationId = data.organization_id;
      subjectUserId = data.user_id;
      invitationId = data.id;
      invitedEmail = data.email_address;
      role = data.role;
      break;
    }
    case "organizationMembership.created":
    case "organizationMembership.updated":
    case "organizationMembership.deleted": {
      const data = eventData as OrganizationMembershipJSON;
      organizationId = data.organization.id;
      subjectUserId = data.public_user_data?.user_id ?? null;
      membershipId = data.id;
      role = data.role;
      break;
    }
    case "organization.created":
    case "organization.updated": {
      const data = eventData as OrganizationJSON;
      organizationId = data.id;
      organizationName = data.name;
      break;
    }
    case "organization.deleted": {
      const data = eventData as DeletedObjectJSON;
      organizationId = data.id ?? null;
      break;
    }
    default:
      // Acknowledge unknown events but don't record them
      return new Response(null, { status: 204 });
  }

  if (!organizationId) {
    return new Response("Missing organization ID", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc("record_clerk_org_event", {
    p_event_id: eventId,
    p_organization_id: organizationId,
    p_event_type: eventType,
    p_occurred_at: occurredAt,
    p_actor_user_id: null,
    p_subject_user_id: subjectUserId,
    p_membership_id: membershipId,
    p_invitation_id: invitationId,
    p_invited_email: invitedEmail,
    p_role: role,
    p_name: organizationName,
  });

  if (error) {
    console.error("Database error recording Clerk event:", error);
    return new Response("Database failure", { status: 500 });
  }

  return new Response(null, { status: 204 });
}
