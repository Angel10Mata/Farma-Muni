"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { APP_LOGO_PATH, APP_NAME } from "@/lib/app-config";

type LogoMuniFullscreenProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LogoMuniFullscreen({ isOpen, onClose }: LogoMuniFullscreenProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <motion.div
          key="fullscreen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1000000] flex cursor-pointer items-center justify-center overflow-hidden bg-white/70 p-4 backdrop-blur-[20px] dark:bg-background/80 lg:p-12"
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}
        >
          <motion.button
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            type="button"
            className="absolute top-8 right-8 z-20 rounded-full bg-black/10 p-3 text-black transition-colors hover:bg-black/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </motion.button>

          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none flex h-full w-full items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 55, damping: 16 }}
              className="pointer-events-auto select-none"
            >
              <Image
                src={APP_LOGO_PATH}
                alt={APP_NAME}
                width={480}
                height={480}
                className="h-[min(70vw,28rem)] w-[min(70vw,28rem)] object-contain"
                priority
              />
            </motion.div>
          </motion.div>

          <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-etiqueta font-bold tracking-[0.5em] text-texto-tenue uppercase">
            Click en cualquier lugar para cerrar
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
