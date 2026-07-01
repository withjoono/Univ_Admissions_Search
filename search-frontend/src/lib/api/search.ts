import { publicClient } from './client';

export interface AdmissionItem {
  id: number;
  trackType: 'SUSI' | 'JEONGSI';
  curriculum: string;
  year: number;
  universityName: string;
  region?: string;
  departmentName: string;
  admissionType: string;
  admissionName: string;
  recruitmentNumber?: number;
  hasInterview: boolean;
}

export type SortKey = 'relevance' | 'year' | 'recruitment';

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: SortKey;
  items: AdmissionItem[];
  disclaimer: string;
}

export interface SearchParams {
  q?: string;
  trackType?: 'SUSI' | 'JEONGSI';
  curriculum?: 'Y2015' | 'Y2022';
  region?: string;
  field?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export async function searchAdmissions(params: SearchParams): Promise<SearchResult> {
  const { data } = await publicClient.get<SearchResult>('/search', { params });
  return data;
}

export interface Facets {
  trackType: { value: string; count: number }[];
  curriculum: { value: string; count: number }[];
  fieldGeneral: { value: string; count: number }[];
}

export async function getFacets(): Promise<Facets> {
  const { data } = await publicClient.get<Facets>('/search/facets');
  return data;
}

export async function compareAdmissions(ids: number[]): Promise<{ items: AdmissionItem[] }> {
  const { data } = await publicClient.get<{ items: AdmissionItem[] }>('/search/compare', {
    params: { ids: ids.join(',') },
  });
  return data;
}
