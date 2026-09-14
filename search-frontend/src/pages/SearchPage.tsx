import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchAdmissions, type SearchParams, type SortKey } from '@/lib/api/search';
import { useSearchFilters } from '@/stores/search-filters';
import { Icon } from '@/components/icon';

const tracks = [{ value: undefined, label: '전체' }, { value: 'SUSI', label: '수시' }, { value: 'JEONGSI', label: '정시' }] as const;
const suggestions = ['컴퓨터공학', '간호학과', '학생부교과', '학생부종합'];

function SearchArtwork() {
  return <div className="search-art" aria-hidden="true">
    <div className="art-orbit" /><span className="art-spark spark-one">+</span><span className="art-spark spark-two">+</span>
    <div className="art-sheet"><div className="art-sheet-head"><span className="art-school"><Icon name="school" size={25} /></span><span>나의 다음 캠퍼스<small>가능성을 발견하는 첫걸음</small></span></div><div className="art-line" /><div className="art-line short" /><div className="art-tags"><span>수시</span><span>정시</span></div><div className="art-check"><Icon name="check" size={14} /> 나에게 맞는 전형 찾기</div></div>
    <div className="art-lens"><Icon name="search" size={55} /></div>
    <span className="art-caption">YOUR NEXT CHAPTER</span>
  </div>;
}

export function SearchPage() {
  const filters = useSearchFilters();
  const [draft, setDraft] = useState(filters.q ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ['search', filters.q, filters.trackType, filters.curriculum, filters.region, filters.sort, filters.page, filters.pageSize],
    queryFn: () => searchAdmissions({ q: filters.q, trackType: filters.trackType, curriculum: filters.curriculum, region: filters.region, sort: filters.sort, page: filters.page, pageSize: filters.pageSize }),
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const reset = () => { filters.reset(); setDraft(''); };
  const search = (q: string) => { setDraft(q); filters.set({ q: q.trim(), page: 1 }); };
  const activeFilters: { key: keyof SearchParams; label: string }[] = [
    ...(filters.q ? [{ key: 'q' as const, label: filters.q }] : []),
    ...(filters.trackType ? [{ key: 'trackType' as const, label: filters.trackType === 'SUSI' ? '수시' : '정시' }] : []),
    ...(filters.curriculum ? [{ key: 'curriculum' as const, label: filters.curriculum === 'Y2015' ? '2015 교육과정' : '2022 교육과정' }] : []),
    ...(filters.region ? [{ key: 'region' as const, label: filters.region }] : []),
  ];
  const page = filters.page ?? 1;
  const totalPages = data?.totalPages ?? 1;

  return <main id="main-content" className="search-page">
    <section className="search-hero" aria-labelledby="search-title">
      <div className="hero-inner">
        <div className="hero-copy"><span className="eyebrow"><span /> 내 가능성을 넓히는 입시 탐색</span><h1 id="search-title">수많은 전형 속,<br /><em>나에게 맞는</em> 한 걸음.</h1><p>대학부터 학과, 수시·정시 전형까지.<br className="mobile-break" /> 흩어진 입시 정보를 한곳에서 찾아보세요.</p></div>
        <SearchArtwork />
        <div className="search-box-wrap">
          <form className="search-box" role="search" onSubmit={(e) => { e.preventDefault(); search(draft); }}>
            <Icon name="search" size={24} /><label className="sr-only" htmlFor="admission-search">대학, 학과, 전형 검색</label><input id="admission-search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="어떤 대학, 학과, 전형을 찾고 있나요?" autoComplete="off" />
            {draft && <button type="button" className="clear-search" aria-label="검색어 지우기" onClick={() => setDraft('')}><Icon name="close" size={18} /></button>}
            <button type="submit" className="primary-button">검색<Icon name="arrow" size={18} /></button>
          </form>
          <div className="suggestions"><span>이렇게 시작해 보세요</span>{suggestions.map((q) => <button key={q} onClick={() => search(q)}>{q}<Icon name="arrow" size={13} /></button>)}</div>
        </div>
      </div>
    </section>

    <div className="search-workspace">
      <aside className="filter-column" aria-label="검색 필터">
        <section className="filter-panel">
          <div className="filter-heading"><h2><Icon name="filter" size={18} />상세 조건</h2><button className="text-button" onClick={reset}><Icon name="reset" size={14} />초기화</button><button className="mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="filter-fields" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? '접기' : `필터 열기${activeFilters.length ? ` (${activeFilters.length})` : ''}`}<Icon name="chevron" size={14} /></button></div>
          <div id="filter-fields" className={`filter-fields ${filtersOpen ? 'is-open' : ''}`}>
            <fieldset><legend>모집 시기</legend><div className="track-options">{tracks.map((t) => <button key={t.label} aria-pressed={filters.trackType === t.value} className={filters.trackType === t.value ? 'selected' : ''} onClick={() => filters.set({ trackType: t.value, page: 1 })}>{t.label}</button>)}</div></fieldset>
            <fieldset><legend>교육과정</legend>{[{ value: '', label: '전체 교육과정', detail: '모든 학년' }, { value: 'Y2015', label: '2015 교육과정', detail: '고3' }, { value: 'Y2022', label: '2022 교육과정', detail: '고1·2' }].map((c) => <label className="radio-option" key={c.value}><input type="radio" name="curriculum" value={c.value} checked={(filters.curriculum ?? '') === c.value} onChange={() => filters.set({ curriculum: (c.value || undefined) as SearchParams['curriculum'], page: 1 })} /><span>{c.label}</span><small>{c.detail}</small></label>)}</fieldset>
            <div className="region-field"><label htmlFor="region-filter">대학 소재지</label><input id="region-filter" placeholder="지역명 입력 (예: 서울)" value={filters.region ?? ''} onChange={(e) => filters.set({ region: e.target.value || undefined, page: 1 })} /></div>
            <p className="filter-tip"><Icon name="info" size={15} />조건을 선택하면 결과에 바로 반영돼요.</p>
          </div>
        </section>
        <Link to="/promo/guide" className="guide-card"><span className="guide-icon"><Icon name="book" size={21} /></span><h3>어디서부터 시작할까요?</h3><p>전형 검색이 처음이라면<br />차근차근 가이드를 따라가 보세요.</p><span className="guide-link">이용 가이드 보기<Icon name="arrow" size={16} /></span></Link>
      </aside>

      <section className="results-section" aria-labelledby="results-title" aria-busy={isFetching}>
        <div className="results-heading"><div><span className="section-eyebrow">EXPLORE ADMISSIONS</span><h2 id="results-title">전형 검색 결과 {data && !isError && <span>{data.total.toLocaleString()}</span>}</h2></div><div className="sort-field"><label className="sr-only" htmlFor="search-sort">결과 정렬</label><select id="search-sort" value={filters.sort ?? ''} onChange={(e) => filters.set({ sort: (e.target.value || undefined) as SortKey | undefined, page: 1 })}><option value="">기본순</option><option value="relevance">관련도순</option><option value="year">학년도순</option><option value="recruitment">모집인원순</option></select></div></div>
        {activeFilters.length > 0 && <div className="active-filters" aria-label="적용된 조건">{activeFilters.map((f) => <button key={f.key} aria-label={`${f.label} 조건 해제`} onClick={() => { filters.set({ [f.key]: undefined, page: 1 }); if (f.key === 'q') setDraft(''); }}>{f.label}<Icon name="close" size={13} /></button>)}</div>}
        <div className="result-status" role="status" aria-live="polite">{isLoading ? '전형 정보를 불러오고 있어요.' : isError ? '현재 검색 정보를 불러올 수 없어요.' : isFetching ? '검색 조건에 맞춰 갱신하고 있어요…' : activeFilters.length ? '선택한 조건에 맞는 전형을 확인해 보세요.' : '관심 있는 대학과 학과의 모집 정보를 살펴보세요.'}</div>
        {isLoading ? <div className="skeleton-list" aria-hidden="true">{[0, 1, 2].map((n) => <div className="skeleton-card" key={n}><div /><div /><div /></div>)}</div>
          : isError ? <div className="empty-state error-state"><span className="empty-icon"><Icon name="info" size={30} /></span><span className="state-eyebrow">잠시 연결이 원활하지 않아요</span><h3>전형 정보를 불러오지 못했어요</h3><p>잠시 후 다시 시도해 주세요.<br />선택한 검색 조건은 그대로 유지됩니다.</p><button className="primary-button" disabled={isFetching} onClick={() => void refetch()}><Icon name="reset" size={16} />{isFetching ? '다시 연결 중…' : '다시 시도'}</button><Link to="/promo/guide" className="empty-guide">검색 이용 가이드<Icon name="arrow" size={14} /></Link></div>
          : data && data.items.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="search" size={32} /></span><span className="state-eyebrow">새로운 가능성을 찾는 중</span><h3>{activeFilters.length ? '조건에 맞는 전형이 아직 없어요' : '아직 등록된 전형 정보가 없어요'}</h3><p>{activeFilters.length ? <>검색어를 짧게 입력하거나 조건을 넓혀보세요.<br />대학명 또는 학과명 하나로 시작해도 좋아요.</> : <>전형 정보가 준비되면 이곳에서 확인할 수 있어요.<br />먼저 검색 방법을 살펴보세요.</>}</p>{activeFilters.length ? <button className="secondary-button" onClick={reset}><Icon name="reset" size={16} />검색 조건 초기화</button> : <Link to="/promo/guide" className="secondary-button">검색 방법 알아보기<Icon name="arrow" size={16} /></Link>}</div>
          : data && <ul className={`result-list ${isPlaceholderData ? 'is-updating' : ''}`}>{data.items.map((it) => <li className="admission-card" key={it.id}><div className="admission-topline"><span className={`track-badge ${it.trackType === 'SUSI' ? 'susi' : 'jungsi'}`}>{it.trackType === 'SUSI' ? '수시' : '정시'}</span><span>{it.year}학년도</span>{it.region && <span>{it.region}</span>}</div><div className="admission-body"><div><p className="university-name">{it.universityName}</p><h3>{it.departmentName}</h3><p className="admission-name">{[it.admissionType, it.admissionName].filter(Boolean).join(' · ')}</p></div><div className="recruitment"><span>모집인원</span><strong>{it.recruitmentNumber != null ? <>{it.recruitmentNumber.toLocaleString()}<small>명</small></> : '미제공'}</strong></div></div><div className="admission-meta"><span>{it.curriculum === 'Y2015' ? '2015 교육과정' : it.curriculum === 'Y2022' ? '2022 교육과정' : it.curriculum}</span>{it.hasInterview && <span>면접 포함</span>}</div></li>)}</ul>}
        {!isError && data && totalPages > 1 && <nav className="pagination" aria-label="검색 결과 페이지"><button disabled={page <= 1 || isPlaceholderData} onClick={() => filters.set({ page: page - 1 })}>이전</button><span><strong>{page}</strong> / {totalPages}</span><button disabled={page >= totalPages || isPlaceholderData} onClick={() => filters.set({ page: page + 1 })}>다음</button></nav>}
        <div className="result-note"><Icon name="info" size={16} /><p>{data?.disclaimer || '전형 정보는 대학의 최종 모집요강을 반드시 확인해 주세요. 합격 가능성·입결은 추정치이며 합격을 보장하지 않습니다.'}</p></div>
        <Link to="/promo/guide" className="results-guide"><span><strong>좋은 선택은, 정확한 탐색에서.</strong><small>검색 조건을 활용하는 방법을 알아보세요.</small></span><span>검색 가이드<Icon name="arrow" size={17} /></span></Link>
      </section>
    </div>
  </main>;
}
