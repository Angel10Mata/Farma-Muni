"use client";

import { cn } from "@/lib/utils";
import { moduleFilterTabUnderlineClass } from "@/components/ui/module-pill-switch";

export const moduleFilterTabsShellClass =
  "flex w-fit max-w-full shrink-0 select-none border-b border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10";

export type ModuleFilterTabOption<T extends string> = {
  id: T;
  label: string;
};

type ModuleFilterUnderlineTabsProps<T extends string> = {
  value: T;
  options: readonly ModuleFilterTabOption<T>[];
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
};

export function ModuleFilterUnderlineTabs<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: ModuleFilterUnderlineTabsProps<T>) {
  return (
    <div
      className={cn(moduleFilterTabsShellClass, className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={moduleFilterTabUnderlineClass(value === opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
