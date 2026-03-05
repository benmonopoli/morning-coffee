import { motion } from "framer-motion";
import CoffeeCup from "@/components/coffee/CoffeeCup";
import { useAuth } from "@/hooks/useAuth";

const Unauthorized = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div className="fixed inset-0 z-0 bg-kissaten" />
      <div className="fixed inset-0 z-0 opacity-[0.04] bg-grain pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-1 z-[3] border-kintsugi" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] text-center px-5 max-w-md"
      >
        <CoffeeCup size={80} steam={false} />
        <h2 className="font-display text-foreground text-2xl mt-5 mb-2 tracking-tight">Access Pending</h2>
        <p className="text-muted-foreground text-sm font-mono mb-2">
          You're signed in as <strong className="text-copper">{user?.email}</strong>
        </p>
        <p className="text-muted-foreground text-[13px] font-mono mb-6">
          Your account hasn't been approved yet. Ask the admin to add your email to the allowed users list.
        </p>
        <button
          onClick={signOut}
          className="px-6 py-2.5 rounded-lg border border-copper/30 text-copper-muted text-[12px] font-mono cursor-pointer bg-cream/[0.06] hover:bg-cream/[0.12] transition-colors"
        >
          Sign Out
        </button>
      </motion.div>
    </div>
  );
};

export default Unauthorized;
