import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers
  const pages = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('...');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      if (i > 1 && i < totalPages) {
        pages.push(i);
      }
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    pages.push(totalPages);
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="p-2 rounded-xl bg-white dark:bg-[#171a17] hover:bg-slate-50 dark:hover:bg-zinc-900 border border-[#C1D1C5]/30 dark:border-[#525D53]/30 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex items-center justify-center min-w-[36px] min-h-[36px]"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((p, i) => (
        <React.Fragment key={i}>
          {p === '...' ? (
            <div className="flex items-center justify-center px-1 text-zinc-400">
              <MoreHorizontal className="size-4" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onPageChange(p as number)}
              className={cn(
                "flex items-center justify-center min-w-[36px] min-h-[36px] px-3 text-sm font-bold rounded-xl transition-all shadow-sm",
                currentPage === p
                  ? "bg-[#8DA78E] text-white"
                  : "bg-white dark:bg-[#171a17] text-zinc-600 dark:text-zinc-300 border border-[#C1D1C5]/30 dark:border-[#525D53]/30 hover:bg-slate-50 dark:hover:bg-zinc-900"
              )}
            >
              {p}
            </button>
          )}
        </React.Fragment>
      ))}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="p-2 rounded-xl bg-white dark:bg-[#171a17] hover:bg-slate-50 dark:hover:bg-zinc-900 border border-[#C1D1C5]/30 dark:border-[#525D53]/30 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex items-center justify-center min-w-[36px] min-h-[36px]"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

export function PageSizeSelect({
  pageSize,
  setPageSize,
  options = DEFAULT_PAGE_SIZE_OPTIONS,
}: {
  pageSize: number;
  setPageSize: (size: number) => void;
  options?: readonly number[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/40 cursor-pointer flex items-center justify-between gap-3 min-w-[70px]"
      >
        <span className="flex-1 text-center">{pageSize}</span>
        <ChevronDown className={cn("size-3 text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1.5 w-full bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-zinc-800 rounded-xl shadow-lg z-50 py-1 flex flex-col min-w-[90px]">
          {options.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                setPageSize(size);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer",
                pageSize === size
                  ? "bg-[#8DA78E]/10 text-[#8DA78E] dark:bg-[#A3BEB0]/10 dark:text-[#A3BEB0]"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900"
              )}
            >
              <span>{size}</span>
              {pageSize === size && <Check className="size-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
