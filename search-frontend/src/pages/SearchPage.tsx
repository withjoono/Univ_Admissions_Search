import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchAdmissions, type SortKey } from '@/lib/api/search';
import { useSearchFilters } from '@/stores/search-filters';

export function SearchPage() {
  const filters = useSearchFilters();
  const [draft, setDraft] = useState(filters.q ?? '');

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['search', filters.q, filters.trackType, filters.curriculum, filters.region, filters.sort, filters.page],
    queryFn: () =>
      searchAdmissions({
        q: filters.q,
        trackType: filters.trackType,
        curriculum: filters.curriculum,
        region: filters.region,
        sort: filters.sort,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const page = filters.page ?? 1;
  const totalPages = data?.totalPages ?? 1;

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22 }}>입시 전형 검색</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          filters.set({ q: draft, page: 1 });
        }}
        style={{ display: 'flex', gap: 8, margin: '16px 0' }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="예: 수도권 컴퓨터공학 학생부종합"
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8 }}
        />
        <button type="submit" style={{ padding: '10px 18px', borderRadius: 8 }}>검색</button>
      </form>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filters.trackType ?? ''} onChange={(e) => filters.set({ trackType: (e.target.value || undefined) as any, page: 1 })}>
          <option value="">전형 전체</option>
          <option value="SUSI">수시</option>
          <option value="JEONGSI">정시</option>
        </select>
        <select value={filters.curriculum ?? ''} onChange={(e) => filters.set({ curriculum: (e.target.value || undefined) as any, page: 1 })}>
          <option value="">교육과정 전체</option>
          <option value="Y2015">2015 (고3)</option>
          <option value="Y2022">2022 (고1~2)</option>
        </select>
        <select value={filters.sort ?? ''} onChange={(e) => filters.set({ sort: (e.target.value || undefined) as SortKey | undefined, page: 1 })}>
          <option value="">정렬: 기본</option>
          <option value="relevance">관련도순</option>
          <option value="year">학년도순</option>
          <option value="recruitment">모집인원순</option>
        </select>
      </div>

      {isLoading && <p>불러오는 중…</p>}
      {isError && <p>검색 중 오류가 발생했습니다.</p>}

      {data && (
        <>
          <p style={{ color: '#666' }}>
            총 {data.total.toLocaleString()}건 {isFetching ? '· 갱신 중…' : ''}
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.items.map((it) => (
              <li key={it.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>
                  {it.universityName} · {it.departmentName}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  [{it.trackType === 'SUSI' ? '수시' : '정시'}] {it.admissionType} · {it.admissionName} · {it.year}학년도
                  {it.recruitmentNumber != null ? ` · 모집 ${it.recruitmentNumber}명` : ''}
                  {it.hasInterview ? ' · 면접有' : ''}
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
              <button disabled={page <= 1} onClick={() => filters.set({ page: page - 1 })}>이전</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => filters.set({ page: page + 1 })}>다음</button>
            </div>
          )}

          <small style={{ color: '#999' }}>{data.disclaimer}</small>
        </>
      )}
    </main>
  );
}
