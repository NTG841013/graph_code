"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { Analysis } from "@/app/lib/data/analyses";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export function AnalysisProgress({ initialAnalysis }: { initialAnalysis: Analysis }) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const router = useRouter();
  const { getToken } = useAuth();
  
  const supabase = useMemo(() => createSupabaseBrowserClient(getToken), [getToken]);

  useEffect(() => {
    // If already completed, redirect immediately
    if (analysis.status === 'completed') {
      router.replace(`/repo/${analysis.id}`);
      return;
    }

    // Polling fallback - check every 5 seconds in case Realtime fails
    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('analyses')
        .select('status, stage, stage_message, total_files, parsed_files, error_message')
        .eq('id', analysis.id)
        .single();
      
      if (data && !error) {
        setAnalysis(prev => {
          // Only update if something actually changed to avoid unnecessary re-renders
          if (
            data.status !== prev.status || 
            data.stage !== prev.stage || 
            data.stage_message !== prev.stage_message ||
            data.total_files !== prev.total_files ||
            data.parsed_files !== prev.parsed_files
          ) {
            return { ...prev, ...data };
          }
          return prev;
        });
      }
    }, 5000);

    // 1. Subscribe to Broadcast channel for live stage updates
    // This is the primary way we get fast progress updates
    const channel = supabase
      .channel(`analysis:${analysis.id}`, {
        config: {
          broadcast: { ack: true }
        }
      })
      .on(
        'broadcast',
        { event: 'progress' },
        (payload) => {
          if (payload.payload) {
            setAnalysis(prev => ({
              ...prev,
              stage: payload.payload.stage ?? prev.stage,
              stage_message: payload.payload.message ?? prev.stage_message,
              status: payload.payload.status ?? prev.status
            }));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Once subscribed, do an immediate check to catch anything missed during transition
          void (async () => {
            const { data } = await supabase
              .from('analyses')
              .select('status, stage, stage_message, total_files, parsed_files')
              .eq('id', analysis.id)
              .single();
            if (data) setAnalysis(prev => ({ ...prev, ...data }));
          })();
        }
      });

    // 2. Subscribe to table changes as a fallback/backup
    const tableChannel = supabase
      .channel(`table-analysis:${analysis.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analyses',
          filter: `id=eq.${analysis.id}`
        },
        (payload) => {
          const newData = payload.new as Analysis;
          setAnalysis(prev => ({
            ...prev,
            ...newData
          }));
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      void supabase.removeChannel(channel);
      void supabase.removeChannel(tableChannel);
    };
  }, [analysis.id, analysis.status, router, supabase]);

  // Handle redirection when status changes to completed
  useEffect(() => {
    if (analysis.status === 'completed') {
      const timer = setTimeout(() => {
        router.replace(`/repo/${analysis.id}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [analysis.status, analysis.id, router]);

  const [owner, repo] = (analysis.projects?.name || "unnamed/project").split('/');

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-accent font-bold">Analysis in progress</p>
          <h1 className="text-xl font-semibold tracking-tight">
            {owner}<span className="text-muted/40">/</span>{repo}
          </h1>
          <p className="text-[10px] text-muted truncate opacity-60">{analysis.projects?.repo_url}</p>
        </div>

        <div className="border border-border bg-surface/30 p-6 space-y-6 relative overflow-hidden">
          <div className="space-y-1 relative z-10">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[10px] uppercase tracking-tighter text-muted">Current Stage</span>
              <span className="text-[10px] font-bold text-accent uppercase bg-accent/10 px-1.5 py-0.5 rounded">
                {analysis.stage || 'initializing'}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed min-h-[3rem]">
              {analysis.stage_message || 'Preparing analysis pipeline...'}
            </p>
          </div>

          {(analysis.status === 'running' || analysis.status === 'pending') && (
             <div className="h-0.5 w-full bg-border/20 overflow-hidden rounded-full">
                <div className="h-full bg-accent animate-progress-indefinite w-1/3" />
             </div>
          )}

          {analysis.status === 'failed' && (
            <div className="p-3 bg-danger/5 border border-danger/20 text-danger text-xs animate-in slide-in-from-top-1">
              <p className="font-bold uppercase text-[10px] mb-1 tracking-widest">Error</p>
              <p className="leading-normal">
                {analysis.error_message || 'An unknown error occurred during analysis.'}
              </p>
            </div>
          )}

          {analysis.status === 'completed' && (
            <div className="p-3 bg-accent/5 border border-accent/20 text-accent text-xs animate-in zoom-in-95">
              <p className="font-bold uppercase text-[10px] mb-1 tracking-widest">Success</p>
              <p className="leading-normal">Analysis complete. Preparing your map...</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/10">
            <div>
              <p className="text-[10px] uppercase text-muted mb-1 opacity-60">Files Found</p>
              <p className="text-sm font-bold">{analysis.total_files ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted mb-1 opacity-60">Files Parsed</p>
              <p className="text-sm font-bold">{analysis.parsed_files ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-muted/40 uppercase tracking-tighter">
          <span>ID: {analysis.id.substring(0, 8)}</span>
          {analysis.status === 'completed' ? (
            <span className="text-accent font-bold animate-pulse">Redirecting...</span>
          ) : analysis.status === 'failed' ? (
            <button 
              onClick={() => router.push('/')}
              className="text-foreground hover:text-accent transition-colors underline underline-offset-2"
            >
              Back to Dashboard
            </button>
          ) : (
            <span>Keep this page open</span>
          )}
        </div>
      </div>
    </div>
  );
}
