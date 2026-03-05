interface CoffeeCupProps {
  size?: number;
  steam?: boolean;
}

const CoffeeCup = ({ size = 64, steam = true }: CoffeeCupProps) => (
  <div className="relative inline-block" style={{ width: size, height: size * 1.1 }}>
    {steam && (
      <svg
        viewBox="0 0 40 20"
        className="absolute"
        style={{ top: -size * 0.28, left: size * 0.15, width: size * 0.7, height: size * 0.35 }}
      >
        {[
          { x: 8, d: "2.5s" },
          { x: 20, d: "3s" },
          { x: 32, d: "2.8s" },
        ].map((s, i) => (
          <path
            key={i}
            d={`M${s.x} 18 C${s.x} 10, ${s.x - 4} 8, ${s.x} 2`}
            fill="none"
            className="stroke-copper-muted"
            strokeWidth={i === 1 ? "2" : "1.8"}
            strokeLinecap="round"
            opacity={0.6 - i * 0.1}
          >
            <animate
              attributeName="d"
              values={`M${s.x} 18 C${s.x} 10, ${s.x - 4} 8, ${s.x} 2;M${s.x} 18 C${s.x + 4} 10, ${s.x - 4} 8, ${s.x} 2;M${s.x} 18 C${s.x} 10, ${s.x - 4} 8, ${s.x} 2`}
              dur={s.d}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={`${0.6 - i * 0.1};0.2;${0.6 - i * 0.1}`}
              dur={s.d}
              repeatCount="indefinite"
            />
          </path>
        ))}
      </svg>
    )}
    <svg viewBox="0 0 80 88" style={{ width: size, height: size }}>
      <defs>
        <linearGradient id="cupGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(35, 40%, 93%)" />
          <stop offset="100%" stopColor="hsl(32, 30%, 82%)" />
        </linearGradient>
        <linearGradient id="coffeeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(20, 60%, 18%)" />
          <stop offset="60%" stopColor="hsl(15, 60%, 8%)" />
        </linearGradient>
        <linearGradient id="bandGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(28, 75%, 45%)" />
          <stop offset="50%" stopColor="hsl(30, 85%, 56%)" />
          <stop offset="100%" stopColor="hsl(28, 75%, 45%)" />
        </linearGradient>
      </defs>
      <path
        d="M12 20 L16 78 C16 82, 20 86, 40 86 C60 86, 64 82, 64 78 L68 20 Z"
        fill="url(#cupGrad)"
        stroke="hsl(30, 30%, 55%)"
        strokeWidth="1.5"
      />
      <ellipse cx="40" cy="20" rx="28" ry="10" fill="url(#cupGrad)" stroke="hsl(30, 30%, 55%)" strokeWidth="1.5" />
      <ellipse cx="40" cy="20" rx="24" ry="7.5" fill="url(#coffeeGrad)" />
      <ellipse cx="36" cy="18" rx="6" ry="2" fill="rgba(255,255,255,0.08)" />
      <rect x="14" y="38" width="52" height="10" rx="2" fill="url(#bandGrad)" opacity="0.8" />
      <path
        d="M68 30 C78 30, 84 38, 82 48 C80 56, 74 58, 68 54"
        fill="none"
        stroke="hsl(30, 30%, 55%)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export default CoffeeCup;
