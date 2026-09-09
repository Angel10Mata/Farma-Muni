"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import Image from "next/image";
import AnimacionLogoKore from "./AnimacionLogoKore";

interface LogoKoreProps {
  scale?: number;
  noAnimation?: boolean;
  backgroundEffect?: "blur" | "glow" | "none";
}

export default function LogoKore({
  noAnimation = false,
  backgroundEffect = "blur",
}: LogoKoreProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!noAnimation) setIsFullScreen(true);
  };

  // — Sweep animation variants —
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const logoVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.88 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 55, damping: 16, duration: 1.6 },
    },
  };

  const sweepVariants = {
    hidden: { opacity: 0, x: -40, clipPath: "inset(0 100% 0 0)" },
    visible: {
      opacity: 1,
      x: 0,
      clipPath: "inset(0 0% 0 0)",
      transition: { duration: 0.7, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
    },
  };

  const lineVariants = {
    hidden: { scaleX: 0, originX: 0 },
    visible: {
      scaleX: 1,
      transition: { duration: 0.9, ease: "easeInOut" as const },
    },
  };

  const suiteVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <>
      <motion.div
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        className="relative select-none cursor-pointer flex flex-col items-center justify-center gap-0 w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo image — big */}
        <motion.div variants={logoVariants} className="flex-shrink-0">
          <Image
            src="/farmamuni/logo.png"
            alt="FarmaMuni"
            width={220}
            height={220}
            className="w-[160px] sm:w-[200px] lg:w-[220px] h-[160px] sm:h-[200px] lg:h-[220px] object-contain"
            priority
          />
        </motion.div>
      </motion.div>

      {mounted &&
        createPortal(
          <AnimacionLogoKore
            isOpen={isFullScreen}
            onClose={() => setIsFullScreen(false)}
          />,
          document.body
        )}
    </>
  );
}
