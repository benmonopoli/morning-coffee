import { useState } from "react";
import CoffeeCup from "./CoffeeCup";
import Stamp from "./Stamp";
import CandidateRow from "./CandidateRow";
import type { ResultsByRole, SelectedState, BatchDoneState, CandidateData } from "@/lib/types";
import { tierRank } from "@/lib/types";

interface ReportViewProps {
  resultsByRole: ResultsByRole;
  selected: SelectedState;
  onToggle: (appId: number, type: "progress" | "reject") => void;
  onBatchAction: (type: "progress" | "reject") => void;
  batchDone: BatchDoneState;
  batchLoading: boolean;
  onFullRerun?: () => void;
  reportDate?: Date | null;
  actionedIds?: Set<number>;
  reportSaved?: boolean | null;
  saveError?: string | null;
}

const ReportView = ({ resultsByRole, selected, onToggle, onBatchAction, batchDone, batchLoading, onFullRerun, reportDate, actionedIds = new Set(), reportSaved, saveError }: ReportViewProps) => {
  const [tab, setTab] = useState<"roles" | "actions">("roles");
  // Manual overrides: move candidates between progress/reject sections
  const [overrides, setOverrides] = useState<Record<number, "progress" | "reject">>({});

  const allCandidates = Object.values(resultsByRole).flatMap((r) => r.candidates);

  const getEffectiveSection = (c: CandidateData): "progress" | "reject" | "maybe" => {
    if (overrides[c.application_id]) return overrides[c.application_id];
    if (c.reject_flag) return "reject";
    if (["Strong Progress", "Progress"].includes(c.analysis?.recommendation)) return "progress";
    return "maybe";
  };

  const progressC = allCandidates.filter((c) => getEffectiveSection(c) === "progress");
  const rejectC = allCandidates.filter((c) => getEffectiveSection(c) === "reject");
  const maybeC = allCandidates.filter((c) => getEffectiveSection(c) === "maybe");

  const handleMove = (appId: number, to: "progress" | "reject") => {
    setOverrides((prev) => ({ ...prev, [appId]: to }));
  };
  const roles = Object.keys(resultsByRole);

  const tabs = [
    { id: "roles" as const, label: "By Role", icon: "📋" },
    { id: "actions" as const, label: "Progress / Reject", icon: "⚡" },
  ];

  const ActionSection = ({
    title, icon, cands, type, variant,
  }: {
    title: string; icon: string; cands: CandidateData[]; type: "progress" | "reject"; variant: "green" | "red";
  }) => {
    const doneSet = batchDone[type] instanceof Set ? batchDone[type] : new Set<number>();
    const undone = cands.filter((c) => !doneSet.has(c.application_id));
    const cnt = undone.filter((c) => selected[type]?.has(c.application_id)).length;
    const btnActive = variant === "green"
      ? "bg-green-tea text-cream border-green-tea shadow-[0_2px_12px_hsl(var(--green-tea)/0.3)]"
      : "bg-destructive text-destructive-foreground border-destructive shadow-[0_2px_12px_hsl(var(--destructive)/0.3)]";
    const oppositeType = type === "progress" ? "reject" : "progress";
    const moveLabel = type === "progress" ? "→ Reject" : "→ Progress";
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-foreground text-base font-bold">
            {icon} {title} <span className="text-muted-foreground font-normal font-mono text-[13px]">({cands.length})</span>
          </h3>
          <button
            onClick={() => onBatchAction(type)}
            disabled={cnt === 0 || batchLoading}
            className={`px-5 py-2 rounded-md font-mono font-extrabold text-[11px] uppercase tracking-wider border-2 transition-all ${
              cnt > 0 ? `${btnActive} cursor-pointer` : "bg-muted text-muted-foreground border-muted cursor-default opacity-50"
            }`}
          >
            {batchLoading ? "Processing..." : type === "progress" ? "Progress" : "Reject"} Selected ({cnt})
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {cands.map((c) => {
            const isGreyedOut = doneSet.has(c.application_id) || actionedIds.has(c.application_id);
            return (
              <div key={c.application_id} className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <CandidateRow
                    candidate={c}
                    showRole
                    checkbox
                    type={type}
                    selected={selected[type]?.has(c.application_id)}
                    done={doneSet.has(c.application_id)}
                    actioned={actionedIds.has(c.application_id)}
                    onToggle={() => onToggle(c.application_id, type)}
                  />
                </div>
                {!isGreyedOut && (
                  <button
                    onClick={() => handleMove(c.application_id, oppositeType)}
                    title={moveLabel}
                    className={`flex-shrink-0 px-2 py-1.5 rounded-md text-[9px] font-mono font-bold tracking-wide border transition-all cursor-pointer ${
                      type === "progress"
                        ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                        : "border-green-tea/30 text-green-tea hover:bg-green-tea/10"
                    }`}
                  >
                    {moveLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="px-5 pb-12 max-w-3xl mx-auto">
      {/* Summary header */}
      <div className="text-center mt-10 mb-3">
        <CoffeeCup size={52} steam={false} />
        <h2 className="font-display text-foreground text-[26px] mt-3 mb-1.5 tracking-tight">Your Morning Brew is Ready</h2>
        {reportSaved === true && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-tea/10 border border-green-tea/30 mb-2">
            <span className="text-green-tea text-[12px]">✓</span>
            <span className="text-green-tea font-mono text-[11px] font-bold tracking-wide">Report saved — safe to exit</span>
          </div>
        )}
        {reportSaved === false && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/30 mb-2">
            <span className="text-destructive text-[12px]">✕</span>
            <span className="text-destructive font-mono text-[11px] font-bold tracking-wide">Failed to save report{saveError ? `: ${saveError}` : ""}</span>
          </div>
        )}
        <p className="text-muted-foreground text-[13px] mb-2 font-mono">
          {allCandidates.length} candidates screened · {roles.length} roles ·{" "}
          {(reportDate || new Date()).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
        <div className="flex justify-center gap-3 mt-3">
          <Stamp variant="green" animated>{progressC.length} Progress</Stamp>
          <Stamp variant="orange" animated>{maybeC.length} Maybe</Stamp>
          <Stamp variant="red" animated>{rejectC.length} Flagged</Stamp>
        </div>
        {onFullRerun && (
          <button
            onClick={onFullRerun}
            className="mt-3 px-5 py-1.5 rounded-md border border-copper/30 text-copper-muted text-[11px] font-mono tracking-wide cursor-pointer bg-cream/[0.06] hover:bg-cream/[0.12] transition-colors"
          >
            ↻ Full Re-run
          </button>
        )}
      </div>

      {/* Decorative divider */}
      <div className="flex items-center justify-center gap-3 my-5">
        <div className="h-px flex-1 max-w-20 bg-copper/20" />
        <span className="text-copper/30 text-[10px] font-mono tracking-widest">☕</span>
        <div className="h-px flex-1 max-w-20 bg-copper/20" />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b-2 border-border mb-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 px-4 bg-transparent font-bold text-[13px] transition-all border-b-[3px] -mb-[2px] font-mono ${
              tab === t.id ? "text-foreground border-copper" : "text-muted-foreground border-transparent hover:text-foreground/70"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content card — washi paper with texture */}
      <div className="bg-washi bg-washi-texture border border-border rounded-2xl p-7" style={{ boxShadow: "var(--shadow-elevated)" }}>
        {tab === "roles" &&
          roles.map((role, ri) => {
            const rd = resultsByRole[role];
            const cands = [...rd.candidates].sort((a, b) => tierRank(a) - tierRank(b));
            const sp = cands.filter((c) => c.analysis?.recommendation === "Strong Progress").length;
            const pr = cands.filter((c) => c.analysis?.recommendation === "Progress").length;
            const rj = cands.filter((c) => c.reject_flag).length;
            return (
              <div key={role} className={ri < roles.length - 1 ? "mb-7" : ""}>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <a
                    href={`https://app4.greenhouse.io/plans/${rd.job_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-foreground text-[17px] font-bold no-underline border-b-2 border-copper/30 hover:border-copper transition-colors"
                  >
                    {role}
                  </a>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-copper/[0.08] text-copper border border-copper/20 font-mono">
                    {cands.length}
                  </span>
                  <div className="flex-1" />
                  {sp > 0 && <span className="text-[10px] text-green-tea font-extrabold font-mono">★ {sp}</span>}
                  {pr > 0 && <span className="text-[10px] text-green-tea-light font-extrabold font-mono">▲ {pr}</span>}
                  {rj > 0 && <span className="text-[10px] text-destructive font-extrabold font-mono">▼ {rj}</span>}
                </div>
                <div className="flex flex-col gap-2">
                  {cands.map((c) => (
                    <CandidateRow key={c.application_id} candidate={c} showRole={false} actioned={actionedIds.has(c.application_id)} />
                  ))}
                </div>
                {ri < roles.length - 1 && <div className="h-px bg-copper/15 mt-7" />}
              </div>
            );
          })}

        {tab === "actions" && (
          <div>
            <ActionSection title="Progress" icon="👍" cands={progressC} type="progress" variant="green" />
            <div className="h-px bg-copper/15 mb-6" />
            <ActionSection title="Reject" icon="👎" cands={rejectC} type="reject" variant="red" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportView;
