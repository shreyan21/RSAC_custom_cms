import { motion, useReducedMotion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Rolex / Rolls-Royce style "layer by layer" reveal: a container whose direct
 * children pop into place one after another (staggered) as the group scrolls
 * into view — each child rises + scales up from a slightly smaller, lower,
 * faded state.
 *
 * Usage:
 *   <RevealStagger as="ul" className="grid ...">
 *     {items.map((x) => <RevealItem as="li" key={x.id}>...</RevealItem>)}
 *   </RevealStagger>
 *
 * Honours prefers-reduced-motion (renders plain, fully-visible markup) so it
 * stays GIGW / WCAG compliant — no motion, nothing stuck hidden.
 */

const containerVariants = (stagger, delay) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
  },
};

export const RevealStagger = ({
  as = "div",
  children,
  className = "",
  stagger = 0.06,
  delay = 0.05,
  amount = 0.2,
  once = true,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount });
  const [forceShow, setForceShow] = useState(false);

  // Safety net: if the IntersectionObserver never reports this group in view
  // (fast scroll, page loaded already scrolled past, or an observer race), reveal
  // it anyway so the children can never stay stuck at opacity 0 / invisible.
  useEffect(() => {
    const id = setTimeout(() => setForceShow(true), 1200);
    return () => clearTimeout(id);
  }, []);

  const Tag = motion[as] || motion.div;

  if (shouldReduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} {...props}>
        {children}
      </Plain>
    );
  }

  return (
    <Tag
      ref={ref}
      variants={containerVariants(stagger, delay)}
      initial="hidden"
      animate={inView || forceShow ? "show" : "hidden"}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
};

export const RevealItem = ({ as = "div", children, className = "", ...props }) => {
  const shouldReduceMotion = useReducedMotion();
  const Tag = motion[as] || motion.div;

  if (shouldReduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} {...props}>
        {children}
      </Plain>
    );
  }

  return (
    <Tag
      variants={itemVariants}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default RevealStagger;
