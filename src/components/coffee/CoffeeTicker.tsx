import { useState, useEffect } from "react";
import { coffeeTips } from "@/lib/coffee-data";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const CoffeeTicker = () => {
  const [idx, setIdx] = useState(0);
  const [animClass, setAnimClass] = useState("animate-ticker-in");

  useEffect(() => {
    const iv = setInterval(() => {
      setAnimClass("animate-ticker-out");
      setTimeout(() => {
        setIdx((i) => (i + 1) % coffeeTips.length);
        setAnimClass("animate-ticker-in");
      }, 400);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  const t = coffeeTips[idx];

  return (
    <div className="max-w-md mx-auto mt-8">
      <div
        className={cn(
          "px-5 py-4 rounded-xl border",
          "flex items-center gap-4 min-h-[64px]",
          animClass
        )}
        style={{
          background: "var(--gradient-walnut)",
          borderColor: "hsl(var(--copper) / 0.25)",
          boxShadow: "0 6px 24px hsl(var(--walnut) / 0.4)",
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border",
            t.type === "tip"
              ? "bg-copper/20 border-copper/30"
              : "bg-copper-muted/15 border-copper-muted/25"
          )}
        >
          <span className="text-lg">{t.type === "tip" ? "💡" : "🌍"}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-[2px] text-copper-glow font-extrabold font-mono block">
            {t.type === "tip" ? "Brewing Tip" : "Coffee Fact"}
          </span>
          <p className="mt-1 text-[13px] text-cream leading-relaxed">
            {t.text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoffeeTicker;
