"use client";

import { usePathname } from "next/navigation";
import { NavDashboard } from "./nav-dashboard";

interface NavDockProps {
  user?: any;
}

export function NavDock({ user }: NavDockProps) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/kore");

  if (isDashboard) {
    return <NavDashboard />;
  }
  return null;
}
