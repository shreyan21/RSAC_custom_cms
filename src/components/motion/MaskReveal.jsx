import { motion, useReducedMotion } from "framer-motion";

/**
 * Rolex / Rolls-Royce style masked text reveal: the heading rises up from
 * behind a clipping edge (overflow-hidden). The heading element itself (with
 * its id / aria) is preserved — only an inner block is animated — so it stays
 * CMS- and screen-reader-safe.
 *
 * Animates on mount (not scroll-gated) so the heading can NEVER stay clipped,
 * even with smooth-scroll or transformed ancestors. Honours
 * prefers-reduced-motion (renders a plain static heading) = GIGW / WCAG.
 */
const MaskReveal = ({
  as = "h2",
  children,
  className = "",
  delay = 0,
  duration = 0.9,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const Tag = as;

  if (shouldReduceMotion) {
    return (
      <Tag className={className} {...props}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag className={`${className} overflow-hidden pb-[0.14em]`} {...props}>
      <motion.span
        style={{ display: "block" }}
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </Tag>
  );
};

export default MaskReveal;
