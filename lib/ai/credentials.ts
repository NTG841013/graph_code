import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AGENT_TOKEN_SECRET || "default_secret_change_me_in_production"
);

export interface AgentCredential {
  analysisId: string;
  orgId: string;
}

/**
 * Mints a short-lived (1 hour) signed credential for the agent.
 */
export async function mintAgentCredential(analysisId: string, orgId: string): Promise<string> {
  return await new SignJWT({ analysisId, orgId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(SECRET);
}

/**
 * Verifies the agent credential and returns the payload.
 */
export async function verifyAgentCredential(token: string): Promise<AgentCredential> {
  const { payload } = await jwtVerify(token, SECRET);
  return {
    analysisId: payload.analysisId as string,
    orgId: payload.orgId as string,
  };
}
