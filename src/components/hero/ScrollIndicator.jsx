import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const ScrollIndicator = () => {
  const [visible, setVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Same reasoning as the Navbar: reading window.scrollY inside a scroll
    // listener forces a layout every scrolled frame. A sentinel observed by
    // IntersectionObserver flips the <120px state with no layout reads.
    if (typeof IntersectionObserver !== "undefined") {
      const sentinel = document.createElement("div");
      sentinel.setAttribute("aria-hidden", "true");
      sentinel.style.cssText =
        "position:absolute;top:0;left:0;width:1px;height:120px;pointer-events:none;visibility:hidden;";
      document.body.prepend(sentinel);

      const observer = new IntersectionObserver(([entry]) => {
        setVisible(entry.isIntersecting);
      });
      observer.observe(sentinel);

      return () => {
        observer.disconnect();
        sentinel.remove();
      };
    }

    const handleScroll = () => {
      const nextVisible = window.scrollY < 120;
      setVisible((current) =>
        current === nextVisible ? current : nextVisible
      );
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 sm:bottom-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 18 }}
        transition={{
          opacity: {
            duration: visible ? 0.45 : 0.28,
            delay: visible ? 0.8 : 0,
          },
          y: {
            duration: visible ? 0.5 : 0.32,
            delay: visible ? 0.8 : 0,
          },
        }}
        className="flex flex-col items-center"
      >
        <div className="relative flex h-[52px] w-[28px] justify-center overflow-hidden rounded-full border border-white/30 bg-white/75 shadow-[0_10px_30px_rgba(18,50,74,0.12)] sm:h-[60px] sm:w-[32px]">
          <motion.div
            animate={
              shouldReduceMotion || !visible ? { y: 12 } : { y: [8, 24, 8] }
            }
            transition={{
              duration: 2,
              repeat: shouldReduceMotion || !visible ? 0 : Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-2 h-[5px] w-[5px] rounded-full bg-emerald-700"
          />
        </div>

        <motion.div
          animate={
            shouldReduceMotion || !visible ? { y: 0 } : { y: [0, 6, 0] }
          }
          transition={{
            duration: 1.8,
            repeat: shouldReduceMotion || !visible ? 0 : Infinity,
          }}
          className="mt-3 text-emerald-800/70"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ScrollIndicator;
