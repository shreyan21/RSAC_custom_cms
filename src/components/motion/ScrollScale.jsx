import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";

/**
 * One-time viewport reveal. It avoids continuous scroll-linked transforms and
 * renders statically when the visitor prefers reduced motion.
 */
const ScrollScale = ({
  as = "div",
  children,
  className = "",
  from = 0.9,
  to = 1,
  lift = 26,
  origin = "center",
  ...props
}) => {
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }

  const Tag = motion[as] || motion.div;

  return (
    <Tag
      ref={ref}
      initial={{ scale: from, y: lift, opacity: 0 }}
      whileInView={{ scale: to, y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: origin }}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default ScrollScale;
