"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  modulePillSwitchTabBtnClass,
  modulePillSwitchTabShellClass,
} from "@/components/ui/module-pill-switch";

const LINKS = [
  { href: "/farmamuni/inventario", label: "Inventario" },
  { href: "/farmamuni/inventario/kardex", label: "Kardex" },
] as const;

export function InventarioSubnav() {
  const pathname = usePathname();

  return (
    <div
      className={modulePillSwitchTabShellClass}
      role="tablist"
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
            role="tab"
            aria-selected={active}
            className={modulePillSwitchTabBtnClass(active)}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
