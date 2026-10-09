"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { DEMO_LOW_STOCK_COUNT } from "@/lib/demo/fixtures";
import { createClient } from "@/utils/supabase/client";
import { MorphIconBox } from "@/components/ui/morph-hover-icon";
import { APP_MODULES, type AppModuleConfig } from "@/lib/app-modules";
import { moduleIconColors, moduleMorphIcons, navMorphIcons } from "@/lib/morph-icons";
import { dashboardInnerClass, dashboardOuterClass } from "@/lib/module-layout";

// SUBCOMPONENTES

function DashboardHeader({
  centered = false,
  title = "Administración",
  subtitle,
}: {
  centered?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 md:mb-4 w-full px-1",
        centered ? "text-center max-w-xl mx-auto" : "text-left",
      )}
    >
      <h1
        className={cn(
          "font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50 leading-[0.95]",
          centered ? "text-2xl md:text-4xl" : "text-3xl md:text-5xl",
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 md:mt-3 text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-snug">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function DashboardBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),transparent_40%)] dark:bg-[linear-gradient(to_bottom,rgba(39,39,42,0.5),transparent_45%)]" />
      <div className="absolute inset-0 opacity-40 dark:opacity-25 [background-image:linear-gradient(rgba(161,161,170,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(161,161,170,0.15)_1px,transparent_1px)] dark:[background-image:linear-gradient(rgba(82,82,91,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(82,82,91,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />
    </div>
  );
}

function ModuleMorphIcon({
  moduleId,
  size,
  hovered,
}: {
  moduleId: string;
  size: number;
  hovered?: boolean;
}) {
  const pair = moduleMorphIcons[moduleId] ?? navMorphIcons.fallback;
  const palette =
    moduleIconColors[moduleId] ?? {
      color: "#2E9BD0",
      boxClass:
        "bg-sky-50 dark:bg-sky-950/45 border-sky-200/90 dark:border-sky-800/55",
    };

  return (
    <MorphIconBox
      from={pair.from}
      to={pair.to}
      size={size}
      color={palette.color}
      strokeWidth={1.75}
      spring="snappy"
      hovered={hovered}
      boxClassName={palette.boxClass}
    />
  );
}

function DashboardModuleCard({
  mod,
  index,
  lowStockCount,
  onNavigate,
  bentoClass,
  featured = false,
}: {
  mod: AppModuleConfig;
  index: number;
  lowStockCount: number;
  onNavigate: (href: string) => void;
  bentoClass?: string;
  featured?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const iconSize = featured
    ? 72
    : mod.size === "hero"
      ? 64
      : mod.size === "tall"
        ? 56
        : mod.size === "wide"
          ? 48
          : 40;

  const iconColor = moduleIconColors[mod.id]?.color ?? "#2E9BD0";

  return (
    <motion.div
      className={cn(
        "cursor-pointer w-full relative col-span-1 row-span-1 group/card",
        bentoClass ?? mod.bento,
        featured && "min-h-[300px] md:min-h-[340px]",
        !featured &&
          (mod.size === "hero" || mod.size === "tall") &&
          "min-h-[250px] sm:min-h-0",
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
            onNavigate(mod.href);
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
        onClick={() => onNavigate(mod.href)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <span
          className={cn(
            "absolute z-20 inline-flex rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
            featured ? "top-5 right-5 left-5 sm:left-auto" : "top-4 right-4 hidden sm:inline-flex",
          )}
        >
          {mod.tag}
        </span>
        <div
          className={cn(
            "w-full h-full flex flex-col relative",
            featured
              ? "justify-between gap-6 p-7 pb-6 md:p-9 md:pb-8"
              : mod.size === "compact" || mod.size === "wide"
                ? "justify-start md:justify-between gap-2 md:gap-0"
                : "justify-between",
            !featured &&
              (mod.size === "hero" || mod.size === "tall"
                ? "p-6 pb-6 md:p-8 md:pb-8"
                : "p-4 pb-3 md:p-5 md:pb-5"),
          )}
        >
          <div
            className={cn(
              "relative z-10 flex w-full",
              featured
                ? "flex-col items-center text-center gap-5 flex-1 pt-6"
                : "flex-row items-center justify-start gap-4",
              !featured &&
                (mod.size === "compact" || mod.size === "wide" ? "md:flex-1" : "flex-1"),
            )}
          >
            <ModuleMorphIcon
              moduleId={mod.id}
              size={iconSize}
              hovered={hovered}
            />

            <div
              className={cn(
                "flex flex-col justify-start",
                featured ? "w-full items-center" : "flex-1 min-w-0",
              )}
            >
              <h3
                className="font-black tracking-tighter uppercase leading-none text-zinc-900 dark:text-zinc-100"
                style={{
                  fontSize: featured
                    ? "2rem"
                    : mod.size === "hero"
                      ? "1.875rem"
                      : mod.size === "tall"
                        ? "1.5rem"
                        : mod.size === "wide"
                          ? "1.25rem"
                          : "1.125rem",
                }}
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

              <p
                className={cn(
                  "text-zinc-500 dark:text-zinc-400 font-medium mt-2 leading-snug",
                  featured
                    ? "text-sm max-w-sm line-clamp-3"
                    : "text-[11px] leading-tight line-clamp-2",
                )}
              >
                {mod.desc}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "relative z-10 flex items-center border-t border-zinc-200 dark:border-zinc-800",
              featured ? "justify-center pt-4 w-full" : "justify-between",
              !featured &&
                (mod.size === "compact" || mod.size === "wide"
                  ? "pt-2 md:pt-2.5 md:mt-2"
                  : "pt-2.5 mt-2"),
            )}
          >
            <div
              className={cn(
                "flex items-center mt-auto",
                featured ? "justify-center w-full" : "justify-between",
              )}
            >
              <span
                className={cn(
                  "text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors inline-flex items-center gap-1.5",
                  !hovered && "text-zinc-400 dark:text-zinc-500",
                )}
                style={hovered ? { color: iconColor } : undefined}
              >
                Entrar al Módulo
                <MorphIconBox
                  from={navMorphIcons.arrowUpRight.from}
                  to={navMorphIcons.arrowUpRight.to}
                  size={14}
                  color={iconColor}
                  strokeWidth={2}
                  spring="snappy"
                  padding="xs"
                  hovered={hovered}
                  boxClassName="border-0 bg-transparent !scale-100"
                />
              </span>
            </div>
          </div>
        </div>
        {mod.id === "inventario" && lowStockCount > 0 && (
          <div className="absolute top-4 left-4 z-20 flex items-center justify-center">
            <span className="relative flex h-3 w-3" title={`¡${lowStockCount} productos en stock mínimo!`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// PANEL PRINCIPAL

export function VerDashboard() {
  const { effectiveRole } = useUserContext();
  const { isDemoMode } = useDemoMode();
  const [lowStockCount, setLowStockCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isDemoMode) {
      setLowStockCount(DEMO_LOW_STOCK_COUNT);
      return;
    }
    const fetchLowStock = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("inv_productos").select("stock_actual, stock_minimo");
      if (data) {
        const count = data.filter((p: { stock_actual: number; stock_minimo: number }) => p.stock_actual <= p.stock_minimo).length;
        setLowStockCount(count);
      } else if (error) {
        console.error("Error fetching low stock:", error);
      }
    };
    void fetchLowStock();
  }, [isDemoMode]);

  const isSuperOrAdmin = ["super", "admin"].includes(effectiveRole);
  const roleLoaded = effectiveRole !== "authenticated";

  const visibleModules = APP_MODULES.filter((mod) => {
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
    .filter(Boolean) as AppModuleConfig[];

  const AreaLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-center gap-3 w-full px-1 mb-4 md:mb-5">
      <div className="h-px flex-1 max-w-24 bg-zinc-200 dark:bg-zinc-800" />
      <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 dark:text-zinc-500 shrink-0">
        {children}
      </span>
      <div className="h-px flex-1 max-w-24 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );

  const isStandardUserView =
    roleLoaded && effectiveRole === "user" && !isSuperOrAdmin;
  const centerSingleModule =
    roleLoaded && (isStandardUserView || negocioModules.length === 1);

  const renderModuleCard = (
    mod: AppModuleConfig,
    index: number,
    featured = false,
  ) => (
    <DashboardModuleCard
      key={mod.id}
      mod={mod}
      index={index}
      lowStockCount={lowStockCount}
      onNavigate={handleCardClick}
      bentoClass={featured ? "col-span-1 row-span-1" : undefined}
      featured={featured}
    />
  );

  const renderBentoGrid = () => (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-4 md:p-6">
      <AreaLabel>Negocio</AreaLabel>
      <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 auto-rows-auto sm:auto-rows-[160px]">
        {negocioModules.map((mod, index) => renderModuleCard(mod, index))}
      </div>
    </div>
  );

  const renderSoloModule = () => {
    const mod = negocioModules[0];
    if (!mod) return null;

    return (
      <div className="w-full max-w-md md:max-w-lg mx-auto flex flex-col items-center gap-5 md:gap-6">
        <DashboardHeader
          centered
          title="Inicio"
          subtitle="Tu acceso al sistema está listo. Entra al módulo para comenzar."
        />
        <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 shadow-sm dark:shadow-none p-1 md:p-1.5">
          {renderModuleCard(mod, 0, true)}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full flex-1 min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <DashboardBackdrop />

      <div className={dashboardOuterClass}>
        <div
          className={cn(
            dashboardInnerClass,
            centerSingleModule && "items-center",
          )}
        >
          {centerSingleModule ? (
            renderSoloModule()
          ) : (
            <>
              <DashboardHeader />
              {renderBentoGrid()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
