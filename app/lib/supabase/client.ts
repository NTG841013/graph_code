import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";
export function createSupabaseBrowserClient(
  getToken?: (options?: { template?: string }) => Promise<string | null>,
) {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => {
        if (getToken) {
          return await getToken({ template: "supabase" }) || "";
        }
        return "";
      },
    }
  );
}
