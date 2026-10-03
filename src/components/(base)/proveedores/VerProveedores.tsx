"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { modulePageShellFixedClass } from "@/lib/module-layout";
import { ComprasProvider } from "./ComprasContext";
import { ComprasProductSection } from "./ComprasProductSection";
import { ComprasCartSidebar } from "./ComprasCartSidebar";
import { HistorialCompras } from "./HistorialCompras";
import { CuentasPorPagar } from "./CuentasPorPagar";
import { CatalogoProveedores } from "./CatalogoProveedores";
import { CrearProveedor } from "./forms/Crear";
import { useProveedoresYProductos, useHistorialCompras } from "./lib/hooks";

const COMPRAS_TABS = [
  { id: "ingresar_compra" as const, label: "Registrar" },
  { id: "proveedores" as const, label: "Proveedores" },
  { id: "historial" as const, label: "Historial" },
  { id: "cuentas_por_pagar" as const, label: "Por pagar" },
];

type ComprasTabId = (typeof COMPRAS_TABS)[number]["id"];

function comprasTabPillClass(active: boolean) {
  return cn(
    "shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all sm:px-4 sm:text-xs",
    active
      ? "bg-white text-[#8DA78E] shadow-sm dark:bg-[#525D53] dark:text-white"
      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
  );
}

function VerProveedoresInner() {
  const [activeTab, setActiveTab] = useState<ComprasTabId>("ingresar_compra");
  const [isCrearOpen, setIsCrearOpen] = useState(false);

  const { data: dataPP, isLoading: isLoadingPP, refetch: refetchPP } = useProveedoresYProductos();
  const productos = dataPP?.productos || [];
  const proveedores = dataPP?.proveedores || [];
  
  const { data: compras = [], isLoading: isLoadingCompras, refetch: refetchCompras } = useHistorialCompras();

  const cargarDatos = () => {
    refetchPP();
    refetchCompras();
  };

  const isLoading = isLoadingPP || isLoadingCompras;

  if (isLoading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-10 min-h-[500px]">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#8DA78E] blur-xl opacity-20 rounded-full animate-pulse" />
            <Truck className="size-12 text-[#8DA78E] animate-bounce" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-800 dark:text-slate-200 font-black text-xl uppercase tracking-widest">
              Cargando Módulo
            </p>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#8DA78E] animate-ping" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 rounded-full bg-[#8DA78E] animate-ping" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-[#8DA78E] animate-ping" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Preparando inventario y compras...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={modulePageShellFixedClass}>
      <div className="flex shrink-0 flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#8DA78E]/20 bg-[#8DA78E]/10">
            <Truck className="size-7 text-[#8DA78E] dark:text-[#A3BEB0]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">
              Compras
            </p>
            <h1 className="mt-1 truncate text-2xl font-black uppercase leading-none tracking-tight text-slate-900 dark:text-white md:text-3xl">
              Gestión de compra
            </h1>
          </div>
        </div>

        <div className="flex w-full shrink-0 justify-end sm:w-auto">
          <div
            className="relative z-30 flex w-fit max-w-full flex-nowrap rounded-xl border border-[#8DA78E]/10 bg-[#8DA78E]/5 p-1"
            role="tablist"
            aria-label="Secciones de compras"
          >
            {COMPRAS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={comprasTabPillClass(isActive)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-1">
      <div className="flex-1 min-h-0 h-full">
        {/* TAB 1: INGRESAR COMPRA */}
        {activeTab === "ingresar_compra" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0 h-full">
            <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-0 overflow-y-auto pb-4 pr-1">
              <ComprasProductSection productos={productos} proveedores={proveedores} />
            </div>
            <div className="lg:col-span-4 h-full flex flex-col gap-4">
              <ComprasCartSidebar proveedores={proveedores} cargarDatos={cargarDatos} />
            </div>
          </div>
        )}

        {/* TAB 2: HISTORIAL DE COMPRAS */}
        {activeTab === "historial" && (
          <HistorialCompras compras={compras} />
        )}

        {/* TAB 3: CATALOGO DE PROVEEDORES */}
        {activeTab === "proveedores" && (
          <CatalogoProveedores 
            proveedores={proveedores} 
            cargarDatos={cargarDatos} 
            setIsCrearOpen={setIsCrearOpen} 
          />
        )}

        {/* TAB 4: CUENTAS POR PAGAR */}
        {activeTab === "cuentas_por_pagar" && (
          <CuentasPorPagar compras={compras} cargarDatos={cargarDatos} />
        )}
      </div>
      </div>

      <CrearProveedor
        isOpen={isCrearOpen}
        onClose={() => setIsCrearOpen(false)}
        onSuccess={cargarDatos}
      />
    </div>
  );
}

export default function VerProveedores() {
  return (
    <ComprasProvider>
      <VerProveedoresInner />
    </ComprasProvider>
  );
}
