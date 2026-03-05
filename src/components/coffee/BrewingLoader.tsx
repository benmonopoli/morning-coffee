import CoffeeCup from "./CoffeeCup";
import Stamp from "./Stamp";
import CoffeeTicker from "./CoffeeTicker";
import type { CoffeeRecipe } from "@/lib/types";

interface BrewingLoaderProps {
  progress: number;
  statusMsg: string;
  recipe: CoffeeRecipe;
}

const BrewingLoader = ({ progress, statusMsg, recipe }: BrewingLoaderProps) => {
  const cur = Math.min(Math.floor((progress / 100) * recipe.steps.length), recipe.steps.length - 1);
  const params = [
    { l: "Coffee", v: recipe.coffee, accent: "bg-copper" },
    { l: "Water", v: recipe.water, accent: "bg-copper-muted" },
    { l: "Grind", v: recipe.grind, accent: "bg-copper-deep" },
    { l: "Ratio", v: recipe.ratio, accent: "bg-latte" },
  ];

  return (
    <div className="text-center px-5 pt-14 pb-12 max-w-2xl mx-auto">
      <CoffeeCup size={76} steam />
      <h2 className="font-display text-foreground text-[28px] mt-4 mb-1 tracking-tight">Brewing your report...</h2>
      <p className="text-muted-foreground italic mb-8 text-sm font-mono">Good things take time. Why not brew along?</p>

      {/* Liquid pour progress bar */}
      <div className="max-w-md mx-auto mb-2">
        <div className="rounded-full h-6 border-2 border-copper/25 bg-washi-dark/60 overflow-hidden" style={{ boxShadow: "var(--shadow-inset-warm)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 relative overflow-hidden animate-pour"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, hsl(var(--copper-deep)), hsl(var(--copper)), hsl(var(--copper-glow)))",
              backgroundSize: "200% 100%",
            }}
          >
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_16px,rgba(255,255,255,0.1)_16px,rgba(255,255,255,0.1)_32px)]" />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-full" />
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-[11px] mb-10 font-semibold font-mono tracking-wide">
        {Math.round(progress)}% — {statusMsg}
      </p>

      {/* Recipe card — aged menu board */}
      <div className="bg-washi bg-washi-texture border border-border rounded-2xl text-left overflow-hidden" style={{ boxShadow: "var(--shadow-elevated)" }}>
        {/* Header — dark walnut strip */}
        <div className="px-7 py-4 flex justify-between items-center border-b-[3px] border-copper" style={{ background: "var(--gradient-walnut)" }}>
          <div>
            <h3 className="font-display text-cream text-lg mb-0.5 tracking-tight">{recipe.name}</h3>
            <p className="text-[11px] text-copper-muted font-mono">🔧 {recipe.equipment}</p>
          </div>
          <Stamp variant="orange" animated>Today's Brew</Stamp>
        </div>

        <div className="px-7 pt-6 pb-7">
          {/* Params grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {params.map((p, i) => (
              <div key={i} className="bg-cream-warm/50 rounded-lg p-3 pl-5 border border-border relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-[3px] h-full ${p.accent}`} />
                <span className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] font-bold font-mono block">{p.l}</span>
                <p className="mt-1 text-sm text-foreground font-bold">{p.v}</p>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] font-bold font-mono">Brew Stages</p>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex flex-col gap-1">
            {recipe.steps.map((s, i) => (
              <div
                key={i}
                className={`flex gap-3 items-start p-2.5 rounded-lg transition-all duration-300 ${
                  i === cur ? "bg-copper/[0.08] border border-copper/20" : "border border-transparent"
                }`}
                style={{ opacity: i <= cur ? 1 : 0.3 }}
              >
                <div
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-display text-[11px] font-bold transition-all ${
                    i < cur
                      ? "bg-copper text-cream"
                      : i === cur
                      ? "bg-copper-glow text-cream"
                      : "bg-muted text-muted-foreground"
                  }`}
                  style={i === cur ? { boxShadow: "var(--shadow-copper-glow)" } : undefined}
                >
                  {i < cur ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <p className={`text-[13px] ${i <= cur ? "text-foreground" : "text-muted-foreground"} ${i === cur ? "font-bold" : "font-semibold"}`}>
                      {s.stage}
                    </p>
                    <span className={`text-[10px] font-mono font-bold ${i === cur ? "text-copper-glow" : "text-muted-foreground"}`}>
                      {s.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pro tip */}
          <div className="mt-6 p-4 bg-copper/[0.06] rounded-lg border-l-[3px] border-copper">
            <p className="text-[12.5px] text-foreground leading-relaxed">
              <strong className="text-copper font-display">Pro Tip —</strong> {recipe.tip}
            </p>
          </div>
        </div>
      </div>

      <CoffeeTicker />
    </div>
  );
};

export default BrewingLoader;
