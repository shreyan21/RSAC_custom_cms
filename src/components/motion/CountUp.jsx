import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Luxury-style animated counter. Parses the numeric part out of a CMS value
 * (e.g. "40+", "1,982", "₹250 Cr", "1982") and counts up to it when scrolled
 * into view, preserving any prefix/suffix text. Non-numeric values render
 * as-is. Honours prefers-reduced-motion (shows the final value, no animation).
 */
const parseValue = (raw) => {
  const str = String(raw ?? "");
  const match = str.match(/-?\d[\d,]*\.?\d*/);

  if (!match) {
    return { num: null, str };
  }

  const matched = match[0];
  const numeric = matched.replace(/,/g, "");
  const decimals = numeric.includes(".") ? numeric.split(".")[1].length : 0;

  return {
    num: parseFloat(numeric),
    decimals,
    grouped: matched.includes(",") || parseFloat(numeric) >= 1000,
    prefix: str.slice(0, match.index),
    suffix: str.slice(match.index + matched.length),
    str,
  };
};

const CountUp = ({ value, className = "", duration = 1.7 }) => {
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const parsed = parseValue(value);
  const { num, decimals = 0, grouped, prefix = "", suffix = "" } = parsed;
  const animatable = num !== null && !shouldReduceMotion;

  const format = (v) => {
    const fixed = decimals ? Number(v.toFixed(decimals)) : Math.round(v);
    const body = grouped ? fixed.toLocaleString("en-IN") : String(fixed);
    return `${prefix}${body}${suffix}`;
  };

  const [animated, setAnimated] = useState(() => format(0));

  useEffect(() => {
    if (!animatable || !inView) {
      return undefined;
    }

    const controls = animate(0, num, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setAnimated(format(v)),
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatable, inView, num]);

  return (
    <span
      ref={ref}
      className={`${className} ${animatable && inView ? "rsac-count-pop" : ""}`.trim()}
    >
      {animatable ? animated : String(value ?? "")}
    </span>
  );
};

export default CountUp;
