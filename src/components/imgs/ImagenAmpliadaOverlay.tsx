"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function ImagenAmpliadaOverlay({
  imageUrl,
  alt = "Imagen ampliada",
  onClose,
}: {
  imageUrl: string | null;
  alt?: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {imageUrl ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-zoom-out"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
          <motion.img
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            src={imageUrl}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[min(90dvh,900px)] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
