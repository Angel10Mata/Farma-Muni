"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/farmamuni/inventario", label: "Inventario" },
  { href: "/farmamuni/inventario/kardex", label: "Kardex" },
] as const;

export function InventarioSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex w-full max-w-md gap-1 rounded-xl border border-[#C1D1C5]/40 bg-[#F5F5F1]/80 p-1 dark:border-[#A3BEB0]/20 dark:bg-zinc-900/60"
      aria-label="Secciones de inventario"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/farmamuni/inventario"
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-colors",
              active
                ? "bg-white text-[#2c5f9b] shadow-sm dark:bg-zinc-800 dark:text-[#6f9fd4]"
                : "text-[#8DA78E] hover:bg-white/60 dark:text-[#A3BEB0] dark:hover:bg-zinc-800/50",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
