"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { motion as tokens } from "@/lib/design-tokens";

const ease = tokens.ease;
const dur = tokens.base / 1000;

/** Fade + rise entrance — max 300ms. */
export function FadeIn({
  children,
  delay = 0,
  className,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur, delay, ease }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Pressable scale wrapper for cards / chips. */
export function Pressable({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: tokens.fast / 1000, ease }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence } from "framer-motion";
