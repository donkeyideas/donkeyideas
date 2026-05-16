'use client';

import { useState } from 'react';

export type SortDir = 'asc' | 'desc';

export function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: K;
  currentSort: K | null;
  currentDir: SortDir;
  onSort: (key: K) => void;
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`text-left px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60 select-none transition-colors ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[9px] ${active ? 'text-gold' : 'text-white/20'}`}>
          {active ? (currentDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  );
}

export function useSort<K extends string>(defaultKey: K | null = null, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<K | null>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const handleSort = (key: K) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  function sortItems<T extends Record<string, any>>(items: T[]): T[] {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];
      if (typeof aVal === 'string' && aVal.match(/^\d{4}-\d{2}/)) {
        aVal = new Date(aVal).getTime();
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal == null) aVal = 0;
      if (bVal == null) bVal = 0;
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return { sortKey, sortDir, handleSort, sortItems };
}
