"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

export default function OfflineBanner() {
  const [status, setStatus] = useState<"online" | "offline" | "slow">("online");

  useEffect(() => {
    const updateStatus = () => {
      let currentStatus: "online" | "offline" | "slow" = "online";
      if (!navigator.onLine) {
        currentStatus = "offline";
      } else {
        const nav = navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string; rtt?: number };
          mozConnection?: { saveData?: boolean; effectiveType?: string; rtt?: number };
          webkitConnection?: { saveData?: boolean; effectiveType?: string; rtt?: number };
        };
        const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
        if (conn) {
          const isSlow = conn.saveData || ["slow-2g", "2g", "3g"].includes(conn.effectiveType ?? "") || (conn.rtt ?? 0) > 500;
          currentStatus = isSlow ? "slow" : "online";
        }
      }

      setStatus(currentStatus);
      document.documentElement.setAttribute("data-connection", currentStatus);
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    window.addEventListener("resize", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      window.removeEventListener("resize", updateStatus);
      document.documentElement.setAttribute("data-connection", "online");
    };
  }, []);

  if (status === "online") return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        <div className={`absolute inset-0 border-[6px] transition-colors duration-500 ${
          status === "offline" ? "border-slate-500/30" : "border-amber-500/20"
        }`} />

        <motion.div
          initial={{ y: -64 }}
          animate={{ y: 0 }}
          exit={{ y: -64 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className={`absolute top-0 left-0 right-0 h-14 md:h-16 flex items-center justify-center pointer-events-auto border-b border-white/10 z-[110] ${
            status === "offline" ? "bg-slate-700 shadow-lg" : "bg-amber-600 shadow-lg"
          }`}
        >
          <div className="flex items-center gap-4 px-10">
            {status === "offline" ? (
              <WifiOff className="w-4 h-4 text-white" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
            )}
            <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-4">
              <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.4em]">
                {status === "offline" ? "Sin Conexión a Internet" : "Conexión Lenta o Inestable"}
              </p>
              <p className="hidden md:block text-[8px] font-bold text-white/40 uppercase tracking-widest">
                {status === "offline" ? "El sistema está en modo lectura" : "Las acciones podrían tardar más"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[9px] font-black text-white transition-all cursor-pointer uppercase tracking-widest"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
