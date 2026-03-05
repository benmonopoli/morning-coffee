import type { CandidateData, FlagType } from "@/lib/types";
import { FLAG_LABELS } from "@/lib/types";

interface CandidateRowProps {
  candidate: CandidateData;
  showRole?: boolean;
  checkbox?: boolean;
  type?: "progress" | "reject";
  selected?: boolean;
  done?: boolean;
  actioned?: boolean;
  onToggle?: () => void;
}

const RecBadge = ({ rec }: { rec: string }) => {
  const styles: Record<string, string> = {
    "Strong Progress": "bg-green-tea/10 text-green-tea border-green-tea/25",
    Progress: "bg-green-tea-light/10 text-green-tea-light border-green-tea-light/25",
    Maybe: "bg-copper-glow/10 text-copper-glow border-copper-glow/25",
    Reject: "bg-destructive/10 text-destructive border-destructive/25",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider font-mono border-[1.5px] ${styles[rec] || styles.Maybe}`}>
      {rec}
    </span>
  );
};

const FlagBadge = ({ flag }: { flag: FlagType }) => {
  const f = FLAG_LABELS[flag];
  return (
    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-destructive/[0.08] text-destructive border border-destructive/20 font-mono">
      {f.icon} {f.label}
    </span>
  );
};

const CandidateRow = ({ candidate: c, showRole, checkbox, type, selected: isSel, done, actioned, onToggle }: CandidateRowProps) => {
  const a = c.analysis;
  const ghProfile = (cid: number, appId: number) => `https://app4.greenhouse.io/people/${cid}/applications/${appId}/redesign`;
  const ghJob = (jid: number) => `https://app4.greenhouse.io/plans/${jid}`;

  const isGreyedOut = done || actioned;

  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all duration-150 hover-warm-glow ${
        isGreyedOut
          ? actioned && !done
            ? "bg-muted/30 border-border opacity-50"
            : type === "progress"
            ? "bg-green-tea/5 border-green-tea/20 opacity-60"
            : "bg-destructive/5 border-destructive/20 opacity-60"
          : isSel
          ? "bg-copper/[0.06] border-copper/30"
          : "bg-cream-warm/40 border-border hover:border-copper/20"
      }`}
    >
      {checkbox && !isGreyedOut && (
        <div
          onClick={onToggle}
          className={`w-5 h-5 rounded flex-shrink-0 cursor-pointer border-2 flex items-center justify-center text-xs font-bold transition-all ${
            isSel
              ? "border-copper bg-copper text-cream"
              : "border-latte bg-transparent hover:border-copper-muted"
          }`}
          style={isSel ? { boxShadow: "0 0 8px hsl(var(--copper) / 0.3)" } : undefined}
        >
          {isSel ? "✓" : ""}
        </div>
      )}
      {checkbox && done && <span className="text-base">{type === "progress" ? "✅" : "❌"}</span>}
      {checkbox && actioned && !done && <span className="text-[10px] font-mono text-muted-foreground">actioned</span>}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={ghProfile(c.candidate_id, c.application_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-bold text-sm no-underline border-b-[1.5px] border-copper/30 hover:border-copper transition-colors"
          >
            {c.name}
          </a>
          {showRole && (
            <>
              <span className="text-copper-muted text-[11px]">→</span>
              <a
                href={ghJob(c.job_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-[12.5px] no-underline border-b border-muted-foreground/30 hover:border-copper transition-colors"
              >
                {c.role}
              </a>
            </>
          )}
          <RecBadge rec={a.recommendation} />
          {c.reject_flag && <FlagBadge flag={c.reject_flag} />}
        </div>
        <p className="mt-1 text-xs text-foreground leading-relaxed font-medium">{a.summary}</p>
        {a.strengths.length > 0 && (
          <p className="mt-0.5 text-[11px] text-green-tea font-medium">
            ✓ {a.strengths.slice(0, 2).join(" · ")}
          </p>
        )}
        {a.concerns.filter((x) => x && !x.toLowerCase().includes("none")).length > 0 && (
          <p className="mt-0.5 text-[11px] text-destructive">
            ⚠ {a.concerns.filter((x) => x && !x.toLowerCase().includes("none")).slice(0, 2).join(" · ")}
          </p>
        )}
        {c.geo_detail && (
          <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">
            📍 {c.geo_detail} {c.geo_source ? `(${c.geo_source})` : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default CandidateRow;
