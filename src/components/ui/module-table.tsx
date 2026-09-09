import { cn } from "@/lib/utils";
import { Pagination, PageSizeSelect } from "@/components/ui/pagination";

export interface ModuleTableFooterProps {
  itemCount: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ModuleTableFooter({
  itemCount,
  pageSize,
  setPageSize,
  currentPage,
  totalPages,
  onPageChange,
  className,
}: ModuleTableFooterProps) {
  if (itemCount <= 0) return null;

  return (
    <div className={cn(moduleTableFooterClass, className)}>
      <div className="flex items-center gap-4">
        <PageSizeSelect
          pageSize={pageSize}
          setPageSize={(size) => {
            setPageSize(size);
            onPageChange(1);
          }}
        />
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export const moduleTableShellClass =
  "flex flex-col flex-1 min-w-0 bg-white dark:bg-zinc-900 border-y md:border border-zinc-200 dark:border-zinc-800 md:rounded-3xl p-5 overflow-hidden shadow-sm";

export const moduleTableToolbarClass =
  "flex flex-col xl:flex-row gap-4 mb-4 justify-between items-start";

export const moduleTableSearchClass =
  "w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/40 transition-all";

export const moduleTableScrollClass =
  "flex-1 overflow-y-auto custom-scrollbar w-full min-h-[400px]";

export const moduleTableEmptyClass =
  "bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-14 text-center text-zinc-400 font-bold";

export const moduleTableDesktopWrapClass =
  "hidden md:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm";

export const moduleTableDesktopScrollClass = "overflow-x-auto";

export const moduleTableClass = "w-full text-left text-xs border-collapse";

export const moduleTableHeadRowClass =
  "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700";

export const moduleTableHeadCellClass = "px-5 py-3.5";

export const moduleTableBodyClass =
  "divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300";

export const moduleTableRowClass =
  "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30";

export const moduleTableCellClass = "px-5 py-3.5";

export const moduleTableEmptyCellClass =
  "text-center py-14 text-zinc-400 font-bold";

export const moduleTableFooterClass =
  "flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400";

export function ModuleTableShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(moduleTableShellClass, className)}>{children}</div>;
}

export function ModuleTableScroll({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(moduleTableScrollClass, className)}>{children}</div>
  );
}

export function ModuleTableEmpty({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(moduleTableEmptyClass, className)}>{children}</div>
  );
}

export function ModuleTableDesktop({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(moduleTableDesktopWrapClass, className)}>
      <div className={moduleTableDesktopScrollClass}>{children}</div>
    </div>
  );
}
