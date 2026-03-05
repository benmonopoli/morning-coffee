import { motion } from "framer-motion";

const stroke = "hsl(30, 30%, 55%)";

const SharedDefs = () => (
  <defs>
    <linearGradient id="paraGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(35, 40%, 93%)" />
      <stop offset="100%" stopColor="hsl(32, 30%, 82%)" />
    </linearGradient>
    <linearGradient id="paraBand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="hsl(28, 75%, 45%)" />
      <stop offset="50%" stopColor="hsl(30, 85%, 56%)" />
      <stop offset="100%" stopColor="hsl(28, 75%, 45%)" />
    </linearGradient>
    <linearGradient id="paraDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(20, 60%, 18%)" />
      <stop offset="60%" stopColor="hsl(15, 60%, 8%)" />
    </linearGradient>
    <linearGradient id="paraGlass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(35, 30%, 88%)" stopOpacity="0.9" />
      <stop offset="100%" stopColor="hsl(32, 25%, 78%)" stopOpacity="0.8" />
    </linearGradient>
  </defs>
);

/** French press */
const FrenchPress = () => (
  <svg viewBox="0 0 60 100" className="w-full h-full">
    <SharedDefs />
    <rect x="14" y="24" width="32" height="60" rx="3" fill="url(#paraGlass)" stroke={stroke} strokeWidth="1.5" />
    <rect x="16" y="50" width="28" height="32" rx="2" fill="url(#paraDark)" opacity="0.9" />
    <line x1="12" y1="24" x2="48" y2="24" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="84" x2="48" y2="84" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    <line x1="30" y1="8" x2="30" y2="24" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="30" cy="8" r="4" fill="url(#paraBand)" stroke={stroke} strokeWidth="1.2" />
    <rect x="14" y="30" width="32" height="6" rx="1" fill="url(#paraBand)" opacity="0.85" />
    <path d="M46 34 C54 36, 54 48, 46 50" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    <rect x="16" y="84" width="28" height="4" rx="2" fill="url(#paraGrad)" stroke={stroke} strokeWidth="1" />
  </svg>
);

/** V60 pour-over cone */
const V60 = () => (
  <svg viewBox="0 0 70 80" className="w-full h-full">
    <SharedDefs />
    {/* Cone body */}
    <path d="M10 12 L28 68 C28 72, 42 72, 42 68 L60 12 Z" fill="url(#paraGrad)" stroke={stroke} strokeWidth="1.5" />
    {/* Rim */}
    <ellipse cx="35" cy="12" rx="25" ry="7" fill="url(#paraGrad)" stroke={stroke} strokeWidth="1.5" />
    {/* Coffee inside */}
    <path d="M16 24 L28 64 C28 66, 42 66, 42 64 L54 24 Z" fill="url(#paraDark)" opacity="0.7" />
    {/* Spiral ridges (V60 signature) */}
    <path d="M18 22 C24 30, 22 38, 30 46" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.6" />
    <path d="M52 22 C46 30, 48 38, 40 46" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.6" />
    <path d="M22 18 C28 28, 26 40, 34 52" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.5" />
    {/* Band */}
    <rect x="22" y="28" width="26" height="5" rx="1" fill="url(#paraBand)" opacity="0.85" />
    {/* Handle */}
    <path d="M10 16 C2 20, 2 28, 10 30" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    {/* Drip from bottom */}
    <ellipse cx="35" cy="74" rx="1.5" ry="2" fill="hsl(20, 60%, 18%)" opacity="0.7">
      <animate attributeName="cy" values="72;76;72" dur="2.2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2.2s" repeatCount="indefinite" />
    </ellipse>
  </svg>
);

/** Coffee bean bag */
const CoffeeBag = () => (
  <svg viewBox="0 0 60 80" className="w-full h-full">
    <SharedDefs />
    {/* Bag body */}
    <path d="M10 22 L8 68 C8 74, 52 74, 52 68 L50 22 Z" fill="hsl(25, 40%, 28%)" stroke="hsl(25, 35%, 20%)" strokeWidth="1.5" />
    {/* Bag top fold */}
    <path d="M10 22 C10 16, 14 12, 20 14 L40 14 C46 12, 50 16, 50 22" fill="hsl(25, 38%, 32%)" stroke="hsl(25, 35%, 20%)" strokeWidth="1.5" />
    {/* Fold crinkle */}
    <path d="M18 16 C22 20, 28 18, 32 20 C36 18, 42 20, 44 16" fill="none" stroke="hsl(25, 30%, 40%)" strokeWidth="0.8" opacity="0.8" />
    {/* Label area */}
    <rect x="14" y="32" width="32" height="24" rx="2" fill="hsl(35, 40%, 90%)" stroke="hsl(30, 30%, 65%)" strokeWidth="0.8" />
    {/* Logo mark */}
    <circle cx="30" cy="40" r="5" fill="none" stroke="hsl(24, 100%, 50%)" strokeWidth="1.8" />
    <path d="M35 40 L35 46" stroke="hsl(24, 100%, 50%)" strokeWidth="1.8" strokeLinecap="round" />
    {/* Text lines on label */}
    <line x1="20" y1="50" x2="40" y2="50" stroke="hsl(25, 30%, 50%)" strokeWidth="1" opacity="0.7" />
    <line x1="24" y1="53" x2="36" y2="53" stroke="hsl(25, 30%, 50%)" strokeWidth="0.8" opacity="0.5" />
    {/* Copper band / tie */}
    <rect x="8" y="26" width="44" height="4" rx="1" fill="url(#paraBand)" opacity="0.9" />
  </svg>
);

/** Hand grinder — tall cylinder with top crank (reference style) */
const HandGrinder = () => (
  <svg viewBox="0 0 48 92" className="w-full h-full">
    <SharedDefs />
    {/* ── Cylindrical body ── */}
    <rect x="10" y="22" width="22" height="56" rx="4" fill="url(#paraGrad)" stroke={stroke} strokeWidth="1.5" />
    {/* ── Horizontal grip bands ── */}
    <line x1="10" y1="34" x2="32" y2="34" stroke={stroke} strokeWidth="1" opacity="0.55" />
    <line x1="10" y1="44" x2="32" y2="44" stroke={stroke} strokeWidth="1" opacity="0.55" />
    <line x1="10" y1="54" x2="32" y2="54" stroke={stroke} strokeWidth="1" opacity="0.55" />
    <line x1="10" y1="64" x2="32" y2="64" stroke={stroke} strokeWidth="1" opacity="0.55" />
    {/* ── Copper band at top ── */}
    <rect x="10" y="24" width="22" height="5" rx="2" fill="url(#paraBand)" opacity="0.9" />
    {/* ── Top cap ── */}
    <rect x="8" y="18" width="26" height="6" rx="3" fill="url(#paraGrad)" stroke={stroke} strokeWidth="1.3" />
    {/* ── Axle post going up ── */}
    <line x1="21" y1="18" x2="21" y2="10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    {/* ── Crank arm going right ── */}
    <line x1="21" y1="10" x2="40" y2="10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    {/* ── Crank arm going down to knob ── */}
    <line x1="40" y1="10" x2="40" y2="4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    {/* ── Crank knob (bulbous, dark — like reference) ── */}
    <path
      d="M35,4 C35,-2 45,-2 45,4 C45,8 40,10 40,10 C40,10 35,8 35,4 Z"
      fill="hsl(25, 28%, 28%)" stroke={stroke} strokeWidth="1"
    />
    {/* ── Bottom base ── */}
    <rect x="8" y="76" width="26" height="5" rx="2.5" fill="url(#paraGrad)" stroke={stroke} strokeWidth="1.2" />
  </svg>
);

const CoffeeParaphernalia = () => (
  <div className="absolute inset-0 flex items-start justify-center pointer-events-none" style={{ top: -4 }}>
    {/* Left items */}
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="flex items-end gap-5 mr-12 mt-4"
    >
      <div className="w-10 h-[68px]">
        <CoffeeBag />
      </div>
      <div className="w-11 h-[72px]">
        <FrenchPress />
      </div>
    </motion.div>

    {/* Center spacer for the mug */}
    <div className="w-[100px] shrink-0" />

    {/* Right items */}
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="flex items-end gap-5 ml-12 mt-4"
    >
      <div className="w-11 h-[68px]">
        <V60 />
      </div>
      <div className="w-11 h-[72px]">
        <HandGrinder />
      </div>
    </motion.div>
  </div>
);

export default CoffeeParaphernalia;
