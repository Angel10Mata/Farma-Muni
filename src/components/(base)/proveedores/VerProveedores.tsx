"use client";

import { useState } from "react";
import { Truck, Receipt, Calendar, User, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComprasProvider } from "./ComprasContext";
import { ComprasProductSection } from "./ComprasProductSection";
import { ComprasCartSidebar } from "./ComprasCartSidebar";
import { HistorialCompras } from "./HistorialCompras";
import { CuentasPorPagar } from "./CuentasPorPagar";
import { CatalogoProveedores } from "./CatalogoProveedores";
import { CrearProveedor } from "./forms/Crear";
import { useProveedoresYProductos, useHistorialCompras } from "./lib/hooks";

function VerProveedoresInner() {
  const [activeTab, setActiveTab] = useState<"ingresar_compra" | "historial" | "proveedores" | "cuentas_por_pagar">("ingresar_compra");
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
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 px-2 pt-32 pb-8 md:px-4 md:pt-28 relative mt-4 md:mt-8 flex-1 min-h-0 h-screen">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between px-1">
        
        {/* Lado Izquierdo: Título */}
        <div className="flex items-center gap-3">
          <div className="bg-[#8DA78E]/10 p-2.5 rounded-xl shrink-0">
            <Truck className="size-5 text-[#8DA78E]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
              COMPRAS
            </p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              GESTIÓN DE COMPRA
            </h2>
          </div>
        </div>

        {/* Lado Derecho: Tabs en formato inline (como en el original) */}
        <div className="flex flex-wrap items-center gap-1 w-full md:w-auto">
          {[
            { id: "ingresar_compra", label: "Registrar Compra" },
            { id: "historial", label: "Historial de Compras" },
            { id: "proveedores", label: "Proveedores" },
            { id: "cuentas_por_pagar", label: "Cuentas por Pagar" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-[#8DA78E] text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

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
