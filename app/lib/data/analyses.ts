import "server-only";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { Database } from "@/app/lib/supabase/database.types";
import { QueryData, SupabaseClient } from "@supabase/supabase-js";

type DB = Database["public"]["Tables"];

/**
 * Shape derived from the Supabase query in getAnalyses.
 * This ensures that changes to the database schema are reflected in the type system.
 * This is wrapped in a function to avoid execution at runtime while preserving type inference.
 */
function queryForType() {
  return ({} as SupabaseClient<Database>)
    .from("analyses")
    .select(`
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
    `);
}

export type Analysis = QueryData<ReturnType<typeof queryForType>>[number];

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
    data: data || [],
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
