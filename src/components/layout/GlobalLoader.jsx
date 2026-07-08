import { AnimatePresence, motion } from "framer-motion";
import { useIsContentLoading } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

// Thin, non-blocking top progress bar shown while the CMS hydrates content for
// the active language. Fallback content stays visible underneath, so this only
// signals that fresh data is loading — it never gates interaction.
const GlobalLoader = () => {
  const loading = useIsContentLoading();
  const { isHindi } = useLanguage();

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="rsac-global-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-x-0 top-0 z-[300] h-[3px] overflow-hidden bg-[#0b6fa4]/12"
          role="status"
          aria-live="polite"
          aria-label={isHindi ? "सामग्री लोड हो रही है" : "Loading content"}
        >
          <motion.span
            className="block h-full w-2/5 rounded-r-full bg-[linear-gradient(90deg,#ff9933_0%,#0b6fa4_55%,#138808_100%)]"
            initial={{ x: "-45%" }}
            animate={{ x: "165%" }}
            transition={{ duration: 1.05, ease: "easeInOut", repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoader;
