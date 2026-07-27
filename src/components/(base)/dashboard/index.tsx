"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import AnimatedIcon from "@/components/ui/AnimatedIcon";
import { createClient } from "@/utils/supabase/client";

import {
  FolderKanban,
  Users,
  Package,
  Truck,
  ShoppingCart,
  ArrowUpRight,
  Wallet,
  CreditCard,
} from "lucide-react";

function VentasIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="18" y="12" width="8" height="8" fill="#F472B6" rx="1" transform="rotate(-6 18 12)" />
      <rect x="25" y="10" width="9" height="10" fill="#34D399" rx="1" transform="rotate(8 25 10)" />
      <rect x="21" y="15" width="10" height="7" fill="#FBBF24" rx="1" />
      <path d="M8 12H13.5L17.5 31H34.5L38.5 16H15" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="37" r="4.5" fill="#1F2937" />
      <circle cx="20" cy="37" r="1.5" fill="#E5E7EB" />
      <circle cx="32" cy="37" r="4.5" fill="#1F2937" />
      <circle cx="32" cy="37" r="1.5" fill="#E5E7EB" />
    </svg>
  );
}

function ProveedoresIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M30 20H37L42 26V35H30V20Z" fill="#60A5FA" />
      <polygon points="35 22 39 26 35 26" fill="#EFF6FF" />
      <rect x="8" y="14" width="22" height="21" rx="1.5" fill="#F59E0B" />
      <line x1="12" y1="14" x2="12" y2="35" stroke="#D97706" strokeWidth="1" />
      <line x1="16" y1="14" x2="16" y2="35" stroke="#D97706" strokeWidth="1" />
      <circle cx="16" cy="36" r="5" fill="#1F2937" />
      <circle cx="16" cy="36" r="2" fill="#FFF" />
      <circle cx="34" cy="36" r="5" fill="#1F2937" />
      <circle cx="34" cy="36" r="2" fill="#FFF" />
    </svg>
  );
}

function CreditosIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Document / Receipt behind */}
      <rect x="14" y="8" width="20" height="24" rx="2" fill="#E2E8F0" />
      <line x1="18" y1="14" x2="30" y2="14" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="19" x2="26" y2="19" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      
      {/* Credit Card */}
      <rect x="4" y="20" width="40" height="24" rx="4" fill="#6366F1" />
      <rect x="4" y="25" width="40" height="6" fill="#1E1B4B" />
      <rect x="10" y="34" width="7" height="5" rx="1" fill="#FBBF24" />
      <rect x="22" y="35.5" width="16" height="2" rx="1" fill="#818CF8" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  inventario: Package,
  proveedores: Truck,
  ventas: ShoppingCart,
  clientes: Users,
  finanzas: Wallet,
  creditos: CreditCard,
};

interface ModuleConfig {
  id: string;
  title: string;
  subtitle: string;
  desc: string;
  href: string;
  allowedRoles?: string[];
  requiresAdmin?: boolean;
  accent: string;
  accentHover: string;
  bento: string;
  size: "hero" | "tall" | "wide" | "compact";
  tag: string;
  cardBg: string;        // Tailwind background classes
  cardBorder: string;    // border color class
  lordIcon?: string;     // Lordicon ID
  lordIconPrimary?: string;
  lordIconSecondary?: string;
  illustration?: React.ComponentType<{ className?: string }>;
  illustrationSize?: string;
}


const MODULES: ModuleConfig[] = [
  {
    id: "ventas",
    title: "Ventas",
    subtitle: "",
    desc: "Punto de venta, control de caja diaria, reportes de ingresos y facturación.",
    href: "/farmacia-la-salud/ventas",
    allowedRoles: ["super", "admin", "ventas", "user"],
    accent: "text-zinc-600 dark:text-zinc-300",
    accentHover: "group-hover:text-zinc-900 dark:group-hover:text-white",
    bento: "col-span-1 row-span-2 md:col-span-2 md:row-span-2",
    size: "hero" as const,
    tag: "Facturación · Caja",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    illustration: VentasIllustration,
    illustrationSize: "size-24 md:size-32",
  },
  {
    id: "clientes",
    title: "Clientes",
    subtitle: "",
    desc: "Directorio de clientes, historial de compras, saldos y fichas de contacto.",
    href: "/farmacia-la-salud/clientes",
    allowedRoles: ["super", "admin", "clientes", "ventas"],
    accent: "text-zinc-600 dark:text-zinc-300",
    accentHover: "group-hover:text-zinc-900 dark:group-hover:text-white",
    bento: "col-span-1 row-span-1 md:col-start-3 md:row-start-1",
    size: "compact" as const,
    tag: "Directorio · Historial",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    lordIcon: "zdwrqfmb",
  },
  {
    id: "proveedores",
    title: "Proveedores",
    subtitle: "",
    desc: "Catálogo de proveedores autorizados, órdenes de compra y facturas.",
    href: "/farmacia-la-salud/proveedores",
    allowedRoles: ["super", "admin", "proveedores"],
    accent: "text-zinc-600 dark:text-zinc-300",
    accentHover: "group-hover:text-zinc-900 dark:group-hover:text-white",
    bento: "col-span-1 row-span-1 md:col-start-3 md:row-start-2",
    size: "compact" as const,
    tag: "Contacto · Compras",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    illustration: ProveedoresIllustration,
  },
  {
    id: "finanzas",
    title: "Finanzas",
    subtitle: "",
    desc: "Ingresos, egresos, control de gastos fijos y pagos de clientes.",
    href: "/farmacia-la-salud/finanzas",
    allowedRoles: ["super", "admin"],
    accent: "text-zinc-600 dark:text-zinc-300",
    accentHover: "group-hover:text-zinc-900 dark:group-hover:text-white",
    bento: "col-span-1 row-span-1 md:col-start-1 md:row-start-3",
    size: "compact" as const,
    tag: "Ingresos · Egresos",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    lordIcon: "hrxrggwa",
  },
  {
    id: "inventario",
    title: "Inventario",
    subtitle: "",
    desc: "Control de existencias de medicamentos, lotes, vencimientos y categorías.",
    href: "/farmacia-la-salud/inventario",
    allowedRoles: ["super", "admin", "inventario"],
    accent: "text-zinc-600 dark:text-zinc-300",
    accentHover: "group-hover:text-zinc-900 dark:group-hover:text-white",
    bento: "col-span-1 row-span-1 md:col-start-3 md:row-start-3",
    size: "compact" as const,
    tag: "Existencias · Lotes",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    lordIcon: "gbzbfgyf",
  },
  {
    id: "creditos",
    title: "Créditos",
    subtitle: "",
    desc: "Gestión de créditos, estados de cuenta y registros de abonos.",
    href: "/farmacia-la-salud/creditos",
    allowedRoles: ["super", "admin", "ventas", "finanzas"],
    accent: "text-zinc-600 dark:text-zinc-300",
    accentHover: "group-hover:text-zinc-900 dark:group-hover:text-white",
    bento: "col-span-1 row-span-1 md:col-start-2 md:row-start-3",
    size: "compact" as const,
    tag: "Cuentas por cobrar",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    illustration: CreditosIllustration,
  },
];


const DashboardHeader = () => (
  <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 w-full px-1">
    <div className="flex-1 min-w-0 flex flex-col">
      <span className="inline-flex w-fit items-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 mb-3">
        Farmacia Salud
      </span>
      <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50 leading-[0.95]">
        Administración
      </h1>
      <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 font-medium mt-3 max-w-xl leading-relaxed">
        Gestione ventas, clientes, inventario y finanzas desde un panel centralizado.
      </p>
    </div>
  </div>
);

function DashboardBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),transparent_40%)] dark:bg-[linear-gradient(to_bottom,rgba(39,39,42,0.5),transparent_45%)]" />
      <div className="absolute inset-0 opacity-40 dark:opacity-25 [background-image:linear-gradient(rgba(161,161,170,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(161,161,170,0.15)_1px,transparent_1px)] dark:[background-image:linear-gradient(rgba(82,82,91,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(82,82,91,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />
    </div>
  );
}


export function Dashboard() {
  const { effectiveRole } = useUserContext();
  const [lowStockCount, setLowStockCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchLowStock = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("inv_productos").select("stock_actual, stock_minimo");
      if (data) {
        const count = data.filter((p: any) => p.stock_actual <= p.stock_minimo).length;
        setLowStockCount(count);
      } else if (error) {
        console.error("Error fetching low stock:", error);
      }
    };
    fetchLowStock();
  }, []);

  const isSuperOrAdmin = ["super", "admin"].includes(effectiveRole);

  // Si el rol aún no cargó ("authenticated"), mostrar todos los módulos temporalmente
  const roleLoaded = effectiveRole !== "authenticated";

  const visibleModules = MODULES.filter((mod) => {
    // Si el rol no ha cargado todavía, mostrar todo (evitar pantalla vacía)
    if (!roleLoaded) return true;
    if (mod.requiresAdmin && !isSuperOrAdmin) return false;
    if (mod.allowedRoles && !mod.allowedRoles.includes(effectiveRole))
      return false;
    return true;
  });


  const handleCardClick = (href: string) => {
    router.push(href);
  };

  const AREA_NEGOCIO = ["ventas", "clientes", "proveedores", "inventario", "finanzas", "creditos"];

  const negocioModules = AREA_NEGOCIO
    .map((id) => visibleModules.find((m) => m.id === id))
    .filter(Boolean) as ModuleConfig[];

  const AreaLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3 w-full px-1 mb-4 md:mb-5">
      <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 dark:text-zinc-500">
        {children}
      </span>
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );

  const renderModuleCard = (mod: ModuleConfig, index: number) => {
    const IconComponent = ICON_MAP[mod.id] || FolderKanban;
    const IllustrationComponent = mod.illustration;
    const iconSizeClass =
      mod.size === "hero"
        ? "size-16 md:size-20"
        : mod.size === "tall"
          ? "size-14 md:size-16"
          : mod.size === "wide"
            ? "size-12 md:size-14"
            : "size-10 md:size-12";
    return (

          <motion.div
            key={mod.id}
            className={cn(
              "cursor-pointer w-full relative col-span-1 row-span-1 group/card",
              mod.bento,
              (mod.size === "hero" || mod.size === "tall") && "min-h-[250px] sm:min-h-0",
            )}
            id={`${mod.id}-card`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
          >
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(mod.href);
                }
              }}
              className={cn(
                "w-full h-full rounded-2xl overflow-hidden cursor-pointer",
                "border",
                mod.cardBorder,
                "shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
                "transition-[box-shadow,border-color,background-color] duration-200",
                mod.cardBg,
              )}
              onClick={() => handleCardClick(mod.href)}
            >
              <span className="absolute top-4 right-4 z-20 hidden sm:inline-flex rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {mod.tag}
              </span>
              <div className={cn(
                  "w-full h-full flex flex-col relative",
                  mod.size === "compact" || mod.size === "wide" ? "justify-start md:justify-between gap-2 md:gap-0" : "justify-between",
                  mod.size === "hero" || mod.size === "tall" ? "p-6 pb-6 md:p-8 md:pb-8" : "p-4 pb-3 md:p-5 md:pb-5"
                )}>
                  {/* Content */}
                  <div className={cn("relative z-10 flex flex-row items-center justify-start gap-4 w-full", mod.size === "compact" || mod.size === "wide" ? "md:flex-1" : "flex-1")}>
                    {/* Icon Container */}
                    <div className="shrink-0 flex items-center justify-center relative">
                      <div className="rounded-xl p-2.5 md:p-3 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                      {mod.lordIcon ? (
                        <AnimatedIcon 
                          iconKey={mod.lordIcon}
                          target={`#${mod.id}-card`}
                          className="transition-transform duration-200 group-hover/card:scale-[1.03]"
                          size={mod.size === "hero" ? 90 : mod.size === "tall" ? 75 : mod.size === "wide" ? 65 : 55}
                          trigger="hover"
                          primaryColor={mod.lordIconPrimary}
                          secondaryColor={mod.lordIconSecondary}
                        />
                      ) : IllustrationComponent ? (
                        <IllustrationComponent
                          className={cn(
                            "transition-transform duration-200 group-hover/card:scale-[1.03] shrink-0",
                            mod.illustrationSize ?? iconSizeClass,
                          )}
                        />
                      ) : (
                        <IconComponent className={cn(
                          "transition-transform duration-200 group-hover/card:scale-[1.03]",
                          mod.accent,
                          iconSizeClass,
                        )} />
                      )}
                      </div>
                    </div>

                    {/* Text details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-start">
                      {/* Title */}
                      <h3
                        className="font-black tracking-tighter uppercase leading-none text-zinc-900 dark:text-zinc-100"
                        style={{ fontSize: mod.size === "hero" ? "1.875rem" : mod.size === "tall" ? "1.5rem" : mod.size === "wide" ? "1.25rem" : "1.125rem" }}
                      >
                        {mod.title}
                        {mod.subtitle ? (
                          <>
                            <br />
                            <span className="text-zinc-800 dark:text-white transition-colors duration-500">
                              {mod.subtitle}
                            </span>
                          </>
                        ) : null}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-2 leading-tight line-clamp-2">
                        {mod.desc}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className={cn(
                    "relative z-10 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800",
                    mod.size === "compact" || mod.size === "wide" ? "pt-2 md:pt-2.5 md:mt-2" : "pt-2.5 mt-2",
                  )}>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover/card:text-zinc-600 dark:text-zinc-500 dark:group-hover/card:text-zinc-300 transition-colors inline-flex items-center gap-1.5">
                        Entrar al Módulo
                        <ArrowUpRight className="size-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </span>
                    </div>
                  </div>
                </div>
              {/* Low Stock Alert - Simple Red Dot */}
              {mod.id === "inventario" && lowStockCount > 0 && (
                <div className="absolute top-4 left-4 z-20 flex items-center justify-center">
                  <span className="relative flex h-3 w-3" title={`¡${lowStockCount} productos en stock mínimo!`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
  };

  const renderBentoGrid = () => (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-4 md:p-6">
      <AreaLabel>Negocio</AreaLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 auto-rows-auto sm:auto-rows-[160px]">
        {negocioModules.map((mod, index) => renderModuleCard(mod, index))}
      </div>
    </div>
  );

  const dashboardContent = (
    <>
      <DashboardHeader />
      {renderBentoGrid()}
    </>
  );

  return (
    <div className="relative w-full flex-1 min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <DashboardBackdrop />

      <div className="relative z-10 w-full flex-1 px-4 md:px-8 lg:px-12 pt-20 md:pt-24 pb-16 md:pb-20">
        <div className="w-full max-w-6xl mx-auto">
          {dashboardContent}
        </div>
      </div>
    </div>
  );
}
