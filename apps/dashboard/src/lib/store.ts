'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  id: string;
  name: string;
  tagline?: string | null;
  status: string;
  logo?: string | null;
}

interface AppState {
  currentCompany: Company | null;
  companies: Company[];
  setCurrentCompany: (company: Company | null) => void;
  setCompanies: (companies: Company[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentCompany: null,
      companies: [],
      setCurrentCompany: (company) => set({ currentCompany: company }),
      setCompanies: (companies) => set({ companies }),
    }),
    {
      name: 'donkey-ideas-store',
    }
  )
);

