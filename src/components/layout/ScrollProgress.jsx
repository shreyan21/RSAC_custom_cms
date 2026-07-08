import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

const ScrollProgress = () => {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    damping: 28,
    mass: 0.18,
    stiffness: 180,
  });

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <motion.div
      aria-hidden="true"
      className="rsac-scroll-progress"
      style={{ scaleX }}
    />
  );
};

export default ScrollProgress;
