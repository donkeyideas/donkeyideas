import { create } from 'zustand';
import { Company, getCompanies } from '../api/companies';

interface CompanyState {
  companies: Company[];
  activeCompany: Company | null;
  isLoading: boolean;
  fetchCompanies: () => Promise<void>;
  setActiveCompany: (company: Company) => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  activeCompany: null,
  isLoading: false,

  fetchCompanies: async () => {
    set({ isLoading: true });
    try {
      const companies = await getCompanies();
      const current = get().activeCompany;
      set({
        companies,
        activeCompany: current || companies[0] || null,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveCompany: (company) => set({ activeCompany: company }),
}));
