import "server-only";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { Database } from "@/app/lib/supabase/database.types";

type DB = Database["public"]["Tables"];

/**
 * Shape derived from the Supabase query in getAnalyses.
 * This ensures that changes to the database schema are reflected in the type system.
 */
export interface Analysis {
  id: DB["analyses"]["Row"]["id"];
  status: DB["analyses"]["Row"]["status"];
  created_at: DB["analyses"]["Row"]["created_at"];
  finished_at: DB["analyses"]["Row"]["finished_at"];
  commit_hash: DB["analyses"]["Row"]["commit_hash"];
  error_message: DB["analyses"]["Row"]["error_message"];
  projects: {
    name: DB["projects"]["Row"]["name"];
    repo_url: DB["projects"]["Row"]["repo_url"];
  } | null;
}

export interface AnalysisResponse {
  data: Analysis[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAnalyses(
  page: number = 1,
  pageSize: number = 10
): Promise<AnalysisResponse> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("analyses")
    .select(
      `
      id,
      status,
      created_at,
      finished_at,
      commit_hash,
      error_message,
      projects (
        name,
        repo_url
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to load analyses: ${error.message}`);
  }

  const totalCount = count || 0;

  return {
    data: (data as unknown as Analysis[]) || [],
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
