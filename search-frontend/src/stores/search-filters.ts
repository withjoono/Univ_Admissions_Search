import { create } from 'zustand';
import type { SearchParams } from '@/lib/api/search';

interface SearchFiltersState extends SearchParams {
  set: (patch: Partial<SearchParams>) => void;
  reset: () => void;
}

const initial: SearchParams = { q: '', page: 1, pageSize: 20, sort: undefined };

export const useSearchFilters = create<SearchFiltersState>((set) => ({
  ...initial,
  set: (patch) => set((s) => ({ ...s, ...patch })),
  reset: () => set({ ...initial }),
}));
