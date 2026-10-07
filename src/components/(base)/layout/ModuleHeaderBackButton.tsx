"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModuleBackHref } from "@/lib/module-back-href";

type ModuleHeaderBackButtonProps = {
  className?: string;
  size?: "sm" | "md";
};

export function ModuleHeaderBackButton({
  className,
  size = "md",
}: ModuleHeaderBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const href = getModuleBackHref(pathname);

  if (!href) return null;

  const boxClass = size === "sm" ? "size-10" : "size-12";
  const iconClass = size === "sm" ? "size-5" : "size-6";

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      aria-label="Regresar"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl border border-[#8DA78E]/20 bg-[#8DA78E]/10",
        "text-[#8DA78E] transition-colors hover:bg-[#8DA78E]/20 dark:text-[#A3BEB0] cursor-pointer",
        boxClass,
        className,
      )}
    >
      <ArrowLeft className={iconClass} aria-hidden />
    </button>
  );
}
