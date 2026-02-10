import { Variants } from 'framer-motion';

// =============================================================================
// PHYSICS - "Apple-like" Spring Configurations
// =============================================================================
export const spring = {
  // Snappy but smooth (for small elements like buttons, toggles)
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },
  // Gentle and premium (for page transitions, modals)
  soft: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  // Slow and deliberate (for large layout changes)
  slow: {
    type: 'spring',
    stiffness: 200,
    damping: 40,
  }
} as const;

// =============================================================================
// PAGE TRANSITIONS - Router-level animations
// =============================================================================
export const pageTransitions: Variants = {
  initial: { 
    opacity: 0, 
    y: 10,
    scale: 0.98,
    filter: 'blur(4px)'
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: spring.soft
  },
  exit: { 
    opacity: 0,
    scale: 0.98,
    filter: 'blur(2px)',
    transition: { duration: 0.2 } 
  }
};

// =============================================================================
// STAGGERED LISTS - For Ideas, Posts, Items
// =============================================================================
export const listContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const listItem: Variants = {
  hidden: { opacity: 0, x: -10, y: 5 },
  show: { 
    opacity: 1, 
    x: 0, 
    y: 0,
    transition: spring.bouncy
  },
  exit: { 
    opacity: 0, 
    height: 0, 
    marginBottom: 0, 
    x: -10,
    transition: { duration: 0.2 } 
  }
};

// =============================================================================
// UI ELEMENTS - Micro-interactions
// =============================================================================
export const ui = {
  button: {
    whileTap: { scale: 0.96 },
    whileHover: { scale: 1.02, y: -1 },
    transition: spring.bouncy
  },
  card: {
    whileHover: { y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" },
    whileTap: { scale: 0.99 },
    transition: spring.soft
  },
  modal: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: spring.soft
  }
};
