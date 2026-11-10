import { getSupabaseAdmin } from "./supabase-admin";
import { normalizeRepoUrl } from "./url-utils";

export async function findOrCreateAnalysis(repoUrl: string, organizationId: string) {
  const supabase = getSupabaseAdmin();
  const normalizedUrl = normalizeRepoUrl(repoUrl);

  // 0. Ensure organization exists (fallback for manual sync)
  const { data: orgExists } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .maybeSingle();
  
  if (!orgExists) {
    // If it doesn't exist, we insert it. We don't have the name here 
    // without a Clerk call, but the ID is what matters for FKs.
    await supabase.from('organizations').insert({ id: organizationId });
  }

  // 1. Check if project already exists for this org
  const { data: project, error: pError } = await supabase
    .from('projects')
    .select('id')
    .eq('repo_url', normalizedUrl)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (pError) throw new Error(`Project lookup failed: ${pError.message}`);

  let existingProject = project;

  if (existingProject) {
    // 2. Check if an analysis already exists for this project
    const { data: analysis, error: aLookupError } = await supabase
      .from('analyses')
      .select('id, status')
      .eq('project_id', existingProject.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aLookupError) throw new Error(`Analysis lookup failed: ${aLookupError.message}`);

    if (analysis) {
      return { analysis, project: existingProject, isNew: false };
    }
  }

  // 3. Create project if not exists
  if (!existingProject) {
    const match = normalizedUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    const projectName = match ? match[1] : normalizedUrl.split('/').pop() || 'unnamed';

    const { data: newProject, error: pInsertError } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        repo_url: normalizedUrl,
        organization_id: organizationId
      })
      .select()
      .single();
    
    if (pInsertError) throw new Error(`Failed to create project: ${pInsertError.message}`);
    existingProject = newProject;
  }

  // 4. Create new analysis
  const { data: analysis, error: aInsertError } = await supabase
    .from('analyses')
    .insert({
      project_id: existingProject!.id,
      organization_id: organizationId,
      status: 'pending',
      stage: 'queued',
      stage_message: 'Waiting to start...'
    })
    .select()
    .single();

  if (aInsertError) throw new Error(`Failed to create analysis: ${aInsertError.message}`);

  return { analysis, project: existingProject, isNew: true };
}
