import { getSupabaseAdmin } from "./supabase-admin";

export async function findOrCreateAnalysis(repoUrl: string, organizationId: string) {
  const supabase = getSupabaseAdmin();

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
  let { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('repo_url', repoUrl)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (project) {
    // 2. Check if an analysis already exists for this project
    const { data: analysis } = await supabase
      .from('analyses')
      .select('id, status')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysis) {
      return { analysis, project, isNew: false };
    }
  }

  // 3. Create project if not exists
  if (!project) {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    const projectName = match ? match[1] : repoUrl.split('/').pop() || 'unnamed';

    const { data: newProject, error: pError } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        repo_url: repoUrl,
        organization_id: organizationId
      })
      .select()
      .single();
    
    if (pError) throw new Error(`Failed to create project: ${pError.message}`);
    project = newProject;
  }

  // 4. Create new analysis
  const { data: analysis, error: aError } = await supabase
    .from('analyses')
    .insert({
      project_id: project!.id,
      organization_id: organizationId,
      status: 'pending',
      stage: 'queued',
      stage_message: 'Waiting to start...'
    })
    .select()
    .single();

  if (aError) throw new Error(`Failed to create analysis: ${aError.message}`);

  return { analysis, project, isNew: true };
}
