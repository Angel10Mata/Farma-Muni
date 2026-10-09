import { cn } from "@/lib/utils";

export const modulePillSwitchShellClass =
  "flex shrink-0 bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 p-1 rounded-2xl";

export const moduleDateFilterShellClass =
  "flex flex-row flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left dark:border-zinc-700 dark:bg-zinc-800/50 w-fit max-w-full";

type ModulePillSwitchBtnOptions = {
  grow?: boolean;
};

export function modulePillSwitchBtnClass(
  active: boolean,
  options?: ModulePillSwitchBtnOptions,
) {
  const grow = options?.grow !== false;
  return cn(
    grow ? "flex-1 min-w-0" : "shrink-0",
    "py-2 px-2 sm:px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer whitespace-nowrap",
    active
      ? "bg-[#8DA78E]/20 text-[#525D53] dark:text-[#A3BEB0]"
      : "text-slate-500",
  );
}

export const modulePillSwitchTabShellClass = cn(
  modulePillSwitchShellClass,
  "w-full max-w-md sm:max-w-[14rem]",
);

export function modulePillSwitchTabBtnClass(
  active: boolean,
  options?: ModulePillSwitchBtnOptions,
) {
  const grow = options?.grow !== false;
  return cn(
    grow ? "flex-1 min-w-0" : "shrink-0",
    "py-2.5 px-2 sm:px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer whitespace-nowrap text-center",
    active
      ? "bg-white text-[#2c5f9b] shadow-sm dark:bg-zinc-800 dark:text-[#6f9fd4]"
      : "text-[#8DA78E] hover:bg-white/60 dark:text-[#A3BEB0] dark:hover:bg-zinc-800/50",
  );
}

export function moduleFilterTabUnderlineClass(active: boolean) {
  return cn(
    "shrink-0 px-3 sm:px-4 py-2 text-xs font-black uppercase tracking-wider text-center border-b-2 cursor-pointer whitespace-nowrap text-[#8DA78E] dark:text-[#A3BEB0]",
    active
      ? "border-[#8DA78E] dark:border-[#A3BEB0]"
      : "border-transparent opacity-75 hover:opacity-100",
  );
}
