import type { Transition } from "framer-motion";

export const MOTION = {
  hoverLift: {
    y: -3,
    scale: 1.01,
  },
  tap: {
    scale: 0.98,
  },
  spring: {
    type: "spring",
    stiffness: 280,
    damping: 22,
    mass: 0.7,
  } satisfies Transition,
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    } satisfies Transition,
  },
};
