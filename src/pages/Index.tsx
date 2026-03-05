import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import CoffeeCup from "@/components/coffee/CoffeeCup";
import CoffeeParaphernalia from "@/components/coffee/CoffeeParaphernalia";
import BrewingLoader from "@/components/coffee/BrewingLoader";
import ReportView from "@/components/coffee/ReportView";
import SettingsView from "@/components/coffee/SettingsView";
import PastReports from "@/components/coffee/PastReports";
import { coffeeRecipes } from "@/lib/coffee-data";
import { locateCandidate, checkRepeat, assignFlag } from "@/lib/candidate-logic";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ResultsByRole, SelectedState, BatchDoneState, CandidateData, RoleResults } from "@/lib/types";

type ViewState = "home" | "loading" | "report" | "settings";

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Index = () => {
  const { isAdmin, signOut } = useAuth();
  const [view, setView] = useState<ViewState>("home");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Initializing...");
  const [recipe] = useState(() => coffeeRecipes[Math.floor(Math.random() * coffeeRecipes.length)]);
  const [resultsByRole, setResultsByRole] = useState<ResultsByRole>({});
  const [selected, setSelected] = useState<SelectedState>({ progress: new Set(), reject: new Set() });
  const [batchDone, setBatchDone] = useState<BatchDoneState>({ progress: new Set(), reject: new Set() });
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<Date | null>(null);
  const [actionedIds, setActionedIds] = useState<Set<number>>(new Set());
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [reportSaved, setReportSaved] = useState<boolean | null>(null); // null = pending, true = saved, false = failed
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  // Fetch last run timestamp (fall back to most recent saved report)
  useEffect(() => {
    const fetchLastRun = async () => {
      const { data } = await supabase
        .from("report_runs")
        .select("last_run_at")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();
      if (data?.last_run_at) {
        setLastRunAt(data.last_run_at);
      } else {
        // Fallback: use most recent saved report's created_at
        const { data: reports } = await supabase
          .from("saved_reports")
          .select("created_at")
          .eq("status", "complete")
          .order("created_at", { ascending: false })
          .limit(1);
        if (reports?.[0]?.created_at) setLastRunAt(reports[0].created_at);
      }
    };
    fetchLastRun();
  }, []);

  // Load actioned candidates from DB
  const loadActionedCandidates = useCallback(async () => {
    const { data } = await supabase.from("actioned_candidates").select("application_id");
    if (data) {
      setActionedIds(new Set(data.map((r: any) => r.application_id)));
    }
  }, []);

  const runReport = useCallback(async () => {
    setView("loading");
    setProgress(0);
    setError(null);
    setResultsByRole({});
    setSelected({ progress: new Set(), reject: new Set() });
    setBatchDone({ progress: new Set(), reject: new Set() });
    setReportSaved(null);
    setSaveError(null);

    try {
      // Step 0: Ensure a report_runs row exists, then read last_run_at
      setStatusMsg("Checking last run...");
      await supabase
        .from("report_runs")
        .upsert({ id: "00000000-0000-0000-0000-000000000001" }, { onConflict: "id" });
      const { data: runRows } = await supabase
        .from("report_runs")
        .select("last_run_at")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();
      const lastRunAt = runRows?.last_run_at || null;

      // Step 1: Fetch open jobs
      setStatusMsg(lastRunAt ? "Delta run — fetching new candidates since last report..." : "First run — fetching all candidates in review...");
      setProgress(5);

      const { data: jobsData, error: jobsErr } = await supabase.functions.invoke("fetch-jobs");
      if (jobsErr) throw new Error(jobsErr.message);
      if (jobsData?.error) throw new Error(jobsData.error);

      const jobs = jobsData.jobs || [];
      if (jobs.length === 0) throw new Error("No open jobs found");

      setStatusMsg(`Found ${jobs.length} open jobs. Fetching candidates...`);
      setProgress(15);

      // Step 2: Fetch candidates (with delta if available)
      const jobIds = jobs.map((j: any) => j.id);
      const { data: candData, error: candErr } = await supabase.functions.invoke("fetch-candidates", {
        body: { job_ids: jobIds, last_run_at: lastRunAt },
      });
      if (candErr) throw new Error(candErr.message);
      if (candData?.error) throw new Error(candData.error);

      const rawCandidates = candData.candidates || [];
      if (rawCandidates.length === 0) throw new Error("No new candidates in Application Review");

      const isDelta = candData.is_delta;
      setStatusMsg(`Found ${rawCandidates.length} ${isDelta ? "new " : ""}candidates. Analyzing in batches...`);
      setProgress(25);

      // Step 3: Analyze candidates in parallel batches
      const results: ResultsByRole = {};
      const total = rawCandidates.length;
      const AI_BATCH_SIZE = 3;
      const ANALYZE_MAX_RETRIES = 5;

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const isTransientBootError = (message: string) => {
        const normalized = message.toLowerCase();
        return (
          normalized.includes("boot_error") ||
          normalized.includes("function failed to start") ||
          normalized.includes("edge function returned 503") ||
          normalized.includes("503")
        );
      };

      const fallbackAnalysis = (reason: string) => ({
        summary: "Analysis unavailable",
        strengths: [],
        concerns: ["AI analysis failed"],
        recommendation: "Maybe" as const,
        reasoning: reason,
        fake_likelihood: "low" as const,
      });

      const analyzeCandidateWithRetry = async (raw: any) => {
        for (let attempt = 0; attempt <= ANALYZE_MAX_RETRIES; attempt++) {
          try {
            const { data: aiData, error: aiErr } = await supabase.functions.invoke("analyze-candidate", {
              body: { candidate: raw },
            });

            const errMsg = aiErr?.message || aiData?.error;
            if (errMsg) {
              if (attempt < ANALYZE_MAX_RETRIES && isTransientBootError(errMsg)) {
                await sleep(800 * Math.pow(2, attempt) + Math.random() * 300);
                continue;
              }
              return fallbackAnalysis(errMsg);
            }

            if (!aiData?.analysis) {
              return fallbackAnalysis("Missing analysis payload");
            }

            return aiData.analysis;
          } catch (e: any) {
            const errMsg = e?.message || "Network error";
            if (attempt < ANALYZE_MAX_RETRIES && isTransientBootError(errMsg)) {
              await sleep(800 * Math.pow(2, attempt) + Math.random() * 300);
              continue;
            }
            return fallbackAnalysis(errMsg);
          }
        }

        return fallbackAnalysis("Analysis retries exhausted");
      };

      // Warm up function once so first real candidates are less likely to hit cold-start issues
      try {
        await supabase.functions.invoke("analyze-candidate", { body: {} });
      } catch {
        // no-op: actual candidate requests below have dedicated retry handling
      }

      for (let batchStart = 0; batchStart < total; batchStart += AI_BATCH_SIZE) {
        const batch = rawCandidates.slice(batchStart, batchStart + AI_BATCH_SIZE);
        const batchEnd = Math.min(batchStart + AI_BATCH_SIZE, total);
        const pct = 25 + Math.round((batchEnd / total) * 65);
        setStatusMsg(`Screening batch ${Math.floor(batchStart / AI_BATCH_SIZE) + 1} (${batchStart + 1}–${batchEnd} of ${total})...`);
        setProgress(pct);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (raw: any) => {
            // Geo check
            const [geoExcluded, geoDetail, geoSource] = locateCandidate(
              { answers: raw.answers, location: raw.location, resume_text: raw.resume_text },
              { addresses: raw.addresses, phone_numbers: raw.phone_numbers, applications: raw.applications },
              raw.resume_text || ""
            );

            // Repeat check
            const [repeatRejected, repeatCount] = checkRepeat({
              applications: raw.applications,
            });

            const analysis = await analyzeCandidateWithRetry(raw);

            const candidate: CandidateData = {
              name: raw.name,
              candidate_id: raw.candidate_id,
              application_id: raw.application_id,
              job_id: raw.job_id,
              role: raw.job_name,
              source: raw.source,
              current_stage_id: raw.current_stage_id,
              current_stage_name: raw.current_stage_name,
              analysis,
              geo_excluded: geoExcluded,
              geo_detail: geoDetail || "",
              geo_source: geoSource,
              repeat_rejected: repeatRejected,
              repeat_count: repeatCount,
              reject_flag: null,
            };
            candidate.reject_flag = assignFlag(candidate);
            return { candidate, role: raw.job_name || "Unknown", job_id: raw.job_id };
          })
        );

        // Merge batch results into results map
        for (const { candidate, role, job_id } of batchResults) {
          if (!results[role]) {
            results[role] = { job_id, candidates: [] };
          }
          results[role].candidates.push(candidate);
        }
      }

      // Step 4: Write last_run_at
      const now = new Date().toISOString();
      await supabase
        .from("report_runs")
        .update({ last_run_at: now })
        .eq("id", "00000000-0000-0000-0000-000000000001");
      setLastRunAt(now);

      // Step 5: Persist report
      const allCands = Object.values(results).flatMap((r) => r.candidates);
      const summary = {
        total: allCands.length,
        progress: allCands.filter((c) => !c.reject_flag && ["Strong Progress", "Progress"].includes(c.analysis?.recommendation)).length,
        maybe: allCands.filter((c) => !c.reject_flag && !["Strong Progress", "Progress"].includes(c.analysis?.recommendation)).length,
        flagged: allCands.filter((c) => c.reject_flag).length,
        roles: Object.keys(results).length,
      };

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Not authenticated — cannot save report");

      const { data: savedReport, error: saveErr } = await supabase.from("saved_reports").insert({
        user_id: userId,
        results_by_role: results as any,
        summary: summary as any,
        status: "complete",
      }).select("id").single();

      if (saveErr) {
        console.error("Failed to save report:", saveErr);
        setReportSaved(false);
        setSaveError(saveErr.message || "Unknown save error");
      } else if (savedReport) {
        setReportSaved(true);
        setCurrentReportId(savedReport.id);
      } else {
        setReportSaved(false);
        setSaveError("No data returned from save");
      }
      await loadActionedCandidates();

      setStatusMsg("Report complete!");
      setProgress(100);
      setResultsByRole(results);
      setReportDate(new Date());
      setTimeout(() => setView("report"), 800);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setView("home");
    }
  }, []);

  const toggleSelect = (appId: number, type: "progress" | "reject") => {
    setSelected((prev) => {
      const next = { ...prev, [type]: new Set(prev[type]) };
      next[type].has(appId) ? next[type].delete(appId) : next[type].add(appId);
      return next;
    });
  };

  const handleBatch = async (type: "progress" | "reject") => {
    setBatchLoading(true);
    try {
      const ids = Array.from(selected[type]);
      if (ids.length === 0) return;

      // For reject actions, build a map of application_id → reject_flag
      let flagMap: Record<number, string | null> | undefined;
      if (type === "reject") {
        const allCandidates = Object.values(resultsByRole).flatMap((r) => r.candidates);
        flagMap = {};
        for (const id of ids) {
          const c = allCandidates.find((c) => c.application_id === id);
          flagMap[id] = c?.reject_flag || null;
        }
      }

      const { data, error: batchErr } = await supabase.functions.invoke("batch-action", {
        body: { action: type, application_ids: ids, ...(flagMap ? { flag_map: flagMap } : {}) },
      });

      if (batchErr) throw new Error(batchErr.message);
      if (data?.error) throw new Error(data.error);

      console.log(`Batch ${type} result:`, data);

      // Record actioned candidates
      const rows = ids.map((appId) => ({
        application_id: appId,
        action: type,
        report_id: currentReportId,
      }));
      await supabase.from("actioned_candidates").upsert(rows, { onConflict: "application_id" });
      setActionedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });

      setBatchDone((p) => {
        const updated = new Set(p[type]);
        ids.forEach((id) => updated.add(id));
        return { ...p, [type]: updated };
      });
    } catch (err: any) {
      console.error(`Batch ${type} error:`, err);
      setError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background layers — warm washi paper with grain */}
      <div className="fixed inset-0 z-0 bg-kissaten" />
      <div className="fixed inset-0 z-0 opacity-[0.04] bg-grain pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-1 z-[3] border-kintsugi" />

      {/* Warm glow at top */}
      <div className="fixed top-0 left-0 right-0 h-40 z-0 pointer-events-none" style={{ background: "var(--gradient-warm-glow)" }} />

      {/* Content */}
      <div className="relative z-[1]">
        {/* Header — dark walnut counter */}
        <header className="mt-1 border-b-[3px] border-copper/50" style={{ background: "var(--gradient-walnut)", boxShadow: "var(--shadow-walnut)" }}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setView("home")} className="flex items-center gap-4 bg-transparent border-none cursor-pointer">
                <CoffeeCup size={38} steam={false} />
                <div className="text-left">
                  <h1 className="font-display text-cream text-[22px] tracking-tight leading-none">Morning Coffee</h1>
                  <p className="text-copper-glow/60 text-[9px] tracking-[4px] uppercase font-bold mt-1 font-mono">
                    Daily Candidate Report
                  </p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-cream/[0.06] rounded-md px-4 py-2 text-copper-muted text-[11px] font-semibold border border-copper/15 font-mono backdrop-blur-sm">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setView("settings")}
                  className={`bg-transparent border border-copper/20 rounded-md px-3 py-2 text-copper-muted text-[11px] font-mono cursor-pointer hover:bg-cream/[0.08] transition-colors ${view === "settings" ? "bg-cream/[0.12] text-copper-glow" : ""}`}
                >
                  ⚙ Settings
                </button>
              )}
              <button
                onClick={signOut}
                className="bg-transparent border border-copper/20 rounded-md px-3 py-2 text-copper-muted text-[11px] font-mono cursor-pointer hover:bg-cream/[0.08] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Home view */}
        {view === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center px-5 pt-24 pb-20"
          >
            <div className="relative inline-block">
              <CoffeeParaphernalia />
              <div className="relative z-[1]">
                <CoffeeCup size={100} steam />
              </div>
            </div>
            <h2 className="font-display text-foreground text-4xl mt-5 mb-3 tracking-tight">Good Morning</h2>
            <p className="text-muted-foreground text-base mb-14 font-mono text-sm">Ready to screen today's candidates?</p>
            {error && <p className="text-destructive mb-4 text-[13px]">Error: {error}</p>}

            <motion.button
              whileHover={{ y: -3, boxShadow: "0 12px 40px hsl(26 72% 42% / 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={runReport}
              className="group relative px-14 py-5 rounded-lg border-2 border-copper-glow/80 cursor-pointer overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(26 72% 42%), hsl(30 80% 54%))" }}
            >
              {/* Sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative font-display text-cream text-lg font-bold uppercase tracking-[3px]">
                Brew My Report
              </span>
            </motion.button>

            {lastRunAt && (
              <p className="text-copper-muted text-[11px] mt-5 font-mono tracking-wide">
                Last brewed: {formatTimeAgo(lastRunAt)}
              </p>
            )}
            <p className="text-muted-foreground text-[11px] mt-3 font-mono tracking-wide">
              ≈ 6 minutes · Enough time to brew a real cup
            </p>

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                await supabase.from("report_runs").update({ last_run_at: null }).eq("id", "00000000-0000-0000-0000-000000000001");
                runReport();
              }}
              className="mt-4 px-6 py-2 rounded-md border border-copper/30 text-copper-muted text-[11px] font-mono tracking-wide cursor-pointer bg-cream/[0.06] hover:bg-cream/[0.12] transition-colors"
            >
              ↻ Full Re-run (ignore last timestamp)
            </motion.button>

            {/* Decorative line */}
            <div className="flex items-center justify-center gap-3 mt-10">
              <div className="h-px w-16 bg-copper/20" />
              <span className="text-copper/40 text-xs">☕</span>
              <div className="h-px w-16 bg-copper/20" />
            </div>

            <PastReports onOpenReport={(report) => {
              setResultsByRole(report.results_by_role);
              setReportDate(new Date(report.created_at));
              setCurrentReportId(report.id);
              setSelected({ progress: new Set(), reject: new Set() });
              setBatchDone({ progress: new Set(), reject: new Set() });
              loadActionedCandidates().then(() => setView("report"));
            }} />
          </motion.div>
        )}

        {/* Loading view */}
        {view === "loading" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <BrewingLoader progress={progress} statusMsg={statusMsg} recipe={recipe} />
          </motion.div>
        )}

        {/* Report view */}
        {view === "report" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <ReportView
              resultsByRole={resultsByRole}
              selected={selected}
              onToggle={toggleSelect}
              onBatchAction={handleBatch}
              batchDone={batchDone}
              batchLoading={batchLoading}
              reportDate={reportDate}
              actionedIds={actionedIds}
              reportSaved={reportSaved}
              saveError={saveError}
              onFullRerun={async () => {
                await supabase.from("report_runs").update({ last_run_at: null }).eq("id", "00000000-0000-0000-0000-000000000001");
                runReport();
              }}
            />
          </motion.div>
        )}

        {/* Settings view */}
        {view === "settings" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <SettingsView />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Index;
