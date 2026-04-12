import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "../../../lib/utils";
import { Button } from "./button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  labels?: {
    previous: string;
    next: string;
  };
  children?: React.ReactNode;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  labels = {
    previous: "Previous",
    next: "Next",
  },
  children,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center justify-between gap-4 px-4 py-2", className)}
    >
      <div className="flex flex-1 items-center justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 gap-1.5 pl-2.5 text-[11px] font-bold tracking-tight text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{labels.previous}</span>
        </Button>
      </div>

      <div className="flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {children}
      </div>

      <div className="flex flex-1 items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 gap-1.5 pr-2.5 text-[11px] font-bold tracking-tight text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-40"
        >
          <span className="hidden sm:inline">{labels.next}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}
