import { motion, useReducedMotion } from "framer-motion";

const motionTags = {
  article: motion.article,
  div: motion.div,
  section: motion.section,
};

const offsets = {
  down: { y: -24 },
  left: { x: 28 },
  right: { x: -28 },
  up: { y: 28 },
};

const Reveal = ({
  as = "div",
  children,
  className = "",
  delay = 0,
  duration = 0.78,
  direction = "up",
  amount = 0.16,
  once = true,
  pop = false,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const Component = motionTags[as] || motion.div;
  const hiddenOffset = offsets[direction] || offsets.up;

  if (shouldReduceMotion) {
    return (
      <Component className={className} {...props}>
        {children}
      </Component>
    );
  }

  // Large section-scale animations create huge compositor layers and visible
  // scroll hitching. Keep the same reveal character using opacity + short lift.
  const hidden = { opacity: 0, ...hiddenOffset };
  const shown = { opacity: 1, x: 0, y: 0 };

  return (
    <Component
      initial={hidden}
      whileInView={shown}
      viewport={{ once, amount }}
      transition={{ duration: pop ? Math.min(duration, 0.58) : duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Reveal;
