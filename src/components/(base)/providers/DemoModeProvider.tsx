"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

const STORAGE_KEY = "farmamuni-demo-mode";

interface DemoModeContextValue {
  isDemoMode: boolean;
  hydrated: boolean;
  setDemoMode: (value: boolean) => void;
  toggleDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  hydrated: false,
  setDemoMode: () => {},
  toggleDemoMode: () => {},
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isDemoMode, setIsDemoModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIsDemoModeState(localStorage.getItem(STORAGE_KEY) === "true");
    setHydrated(true);
  }, []);

  const setDemoMode = useCallback(
    (value: boolean) => {
      setIsDemoModeState(value);
      localStorage.setItem(STORAGE_KEY, String(value));
      queryClient.clear();
      toast.info(
        value
          ? "Modo simulación activado — datos de ejemplo."
          : "Modo simulación desactivado — datos reales.",
      );
    },
    [queryClient],
  );

  const toggleDemoMode = useCallback(() => {
    setDemoMode(!isDemoMode);
  }, [isDemoMode, setDemoMode]);

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode: hydrated ? isDemoMode : false,
        hydrated,
        setDemoMode,
        toggleDemoMode,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
