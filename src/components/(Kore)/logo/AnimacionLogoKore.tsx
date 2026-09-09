"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface AnimacionLogoKoreProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnimacionLogoKore({ isOpen, onClose }: AnimacionLogoKoreProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="fullscreen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-white/70 dark:bg-background/80 backdrop-blur-[20px] cursor-pointer p-4 lg:p-12 overflow-hidden"
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            className="absolute top-8 right-8 p-3 rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 transition-colors z-20"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </motion.button>

          {/* Content — vertical layout with FarmaMuni branding */}
          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="w-full h-full flex items-center justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto flex flex-col items-center justify-center gap-0 select-none"
            >
              {/* FarmaMuni logo */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 55, damping: 16, duration: 1.6 }}
                className="flex-shrink-0"
              >
                <Image
                  src="/farmamuni/logo.png"
                  alt="FarmaMuni"
                  width={400}
                  height={400}
                  className="w-[240px] sm:w-[320px] lg:w-[400px] h-[240px] sm:h-[320px] lg:h-[400px] object-contain"
                  priority
                />
              </motion.div>

              {/* Brand text */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center leading-none gap-0 -mt-6 sm:-mt-10 lg:-mt-14"
              >
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#1a6aa5] dark:text-[#4da8da]">Farma</span>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#4caf50] dark:text-[#66bb6a]">Muni</span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-2"
                >
                  Tu Bienestar, Nuestro Compromiso
                </motion.span>
              </motion.div>
            </div>
          </motion.div>

          {/* Close hint */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-black/60 dark:text-white/40 text-[10px] font-black tracking-[0.5em] uppercase pointer-events-none animate-bounce">
            Click en cualquier lugar para cerrar
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
