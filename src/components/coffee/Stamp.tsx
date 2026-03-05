import { cn } from "@/lib/utils";

interface StampProps {
  children: React.ReactNode;
  variant?: "copper" | "green" | "red" | "orange";
  animated?: boolean;
  className?: string;
}

const variantStyles = {
  copper: "border-copper text-copper",
  green: "border-green-tea text-green-tea",
  red: "border-destructive text-destructive",
  orange: "border-copper-glow text-copper-glow",
};

const Stamp = ({ children, variant = "copper", animated = false, className }: StampProps) => (
  <span
    className={cn(
      "inline-block px-3 py-1 border-2 rounded font-mono text-[10px] font-extrabold uppercase tracking-[2px] -rotate-2",
      variantStyles[variant],
      animated && "animate-stamp",
      className
    )}
  >
    {children}
  </span>
);

export default Stamp;
