import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ResultsByRole } from "@/lib/types";

interface SavedReport {
  id: string;
  created_at: string;
  summary: { total?: number; progress?: number; maybe?: number; flagged?: number; roles?: number };
  results_by_role: ResultsByRole;
}

interface PastReportsProps {
  onOpenReport: (report: SavedReport) => void;
}

const PastReports = ({ onOpenReport }: PastReportsProps) => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("saved_reports")
      .select("id, created_at, summary, results_by_role")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(20);
    setReports((data as any as SavedReport[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("saved_reports").delete().eq("id", id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-5">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => { setOpen((o) => !o); if (!open) fetchReports(); }}
        className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-copper/25 bg-cream-warm/30 hover:bg-cream-warm/50 cursor-pointer transition-colors"
      >
        <div className="h-px flex-1 max-w-12 bg-copper/20" />
        <h3 className="font-display text-foreground text-sm tracking-tight">
          📂 Past Reports {!loading && `(${reports.length})`}
        </h3>
        <div className="h-px flex-1 max-w-12 bg-copper/20" />
        <span className={`text-copper-muted text-[11px] font-mono transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-3 flex flex-col gap-2">
              {loading && (
                <p className="text-center text-muted-foreground text-[11px] font-mono py-4">Loading past reports...</p>
              )}

              {!loading && reports.length === 0 && (
                <div className="text-center py-6 px-4 rounded-xl border border-dashed border-copper/20 bg-cream-warm/20">
                  <p className="text-muted-foreground text-[12px] font-mono">No saved reports yet</p>
                  <p className="text-muted-foreground/60 text-[11px] font-mono mt-1">Brew your first report above — it'll appear here automatically.</p>
                </div>
              )}

              {!loading && reports.map((r, i) => {
                const s = r.summary || {};
                const date = new Date(r.created_at);
                const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-cream-warm/40 hover:border-copper/20 transition-all cursor-pointer group"
                    onClick={() => onOpenReport(r)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-[13px] font-bold font-display">{dateStr}</p>
                      <p className="text-muted-foreground text-[11px] font-mono mt-0.5">
                        {s.progress ?? 0} Progress · {s.maybe ?? 0} Maybe · {s.flagged ?? 0} Flagged
                      </p>
                    </div>
                    <span className="text-copper-muted text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      View →
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      className="text-destructive/40 hover:text-destructive text-[13px] bg-transparent border-none cursor-pointer transition-colors p-1.5 rounded-md hover:bg-destructive/10"
                      title="Delete report"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PastReports;
