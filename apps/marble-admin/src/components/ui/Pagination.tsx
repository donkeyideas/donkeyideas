'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showing?: string;
}

export function Pagination({ page, totalPages, onPageChange, showing }: PaginationProps) {
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
      {showing && <span className="text-xs text-white/30">{showing}</span>}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2.5 py-1 rounded-lg text-xs text-white/50 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          &lt;
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                pageNum === page
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'text-white/50 hover:bg-white/5'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2.5 py-1 rounded-lg text-xs text-white/50 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
