import { createRoute, Link } from '@tanstack/react-router';
import { rootRoute } from './root';

/**
 * 입시 전형 검색 프로모 (기능 소개 · 사용법 · 블로그)
 * 이 앱은 Tailwind가 없어 인라인 스타일로 자체완결 구성했습니다.
 */

const ACCENT = '#0f766e';
const INK = '#0f172a';
const MUTED = '#556070';
const BORDER = '#e3e8ee';
const CARD = '#ffffff';
const SOFT = '#eef6f5';

const TABS = [
  { to: '/promo', label: '기능 소개' },
  { to: '/promo/guide', label: '사용법' },
  { to: '/promo/blog', label: '블로그' },
];

function PromoShell({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="promo-shell">
    <nav className="promo-tabs" aria-label="서비스 안내">
      {TABS.map((t) => <Link key={t.to} to={t.to} activeProps={{ className: 'active', 'aria-current': 'page' }} activeOptions={{ exact: t.to === '/promo' }}>{t.label}</Link>)}
    </nav>
    {children}
  </main>;
}
function Hero({ badge, title, body }: { badge: string; title: string; body: string }) {
  return (
    <section style={{ background: `linear-gradient(135deg, ${SOFT} 0%, #fff 100%)`, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '34px 24px', textAlign: 'center' }}>
      <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: ACCENT, background: '#d9efec', borderRadius: 999, padding: '4px 12px', marginBottom: 12 }}>{badge}</span>
      <h1 style={{ fontSize: 27, fontWeight: 800, color: INK, margin: '4px 0 10px', lineHeight: 1.35 }}>{title}</h1>
      <p style={{ fontSize: 15, color: MUTED, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>{body}</p>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 19, fontWeight: 800, color: INK, margin: '32px 0 14px' }}>{children}</h2>;
}
function Card({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: INK, margin: '0 0 6px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.65 }}>{body}</p>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>{children}</div>;
}
function CTA({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{ display: 'inline-block', marginTop: 8, padding: '12px 22px', borderRadius: 12, background: ACCENT, color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>{label}</a>
  );
}

// ───────── 기능 소개(메인) ─────────
function PromoHome() {
  return (
    <PromoShell>
      <Hero
        badge="입시 전형 통합 검색"
        title="복잡한 수시·정시 전형, 한 번에 검색하세요"
        body="관심 대학과 학과를 검색하고, 모집 시기·교육과정·지역으로 조건을 좁혀보세요. 전형의 핵심 정보를 한눈에 살펴볼 수 있습니다."
      />
      <SectionTitle>핵심 기능</SectionTitle>
      <Grid>
        <Card title="통합 전형 검색" body="대학명·학과명·전형명으로 등록된 수시·정시 정보를 함께 검색합니다." />
        <Card title="나에게 맞는 검색 조건" body="모집 시기·교육과정·대학 소재지를 선택해 관심 전형을 좁혀갑니다." />
        <Card title="원하는 순서로 탐색" body="관련도·학년도·모집인원 순으로 정렬해 필요한 정보를 먼저 확인합니다." />
        <Card title="전형 상세 정보" body="대학·학과·전형명·모집인원·면접 여부를 결과 카드에서 확인합니다." />
      </Grid>
      <SectionTitle>더 알아보기</SectionTitle>
      <Grid>
        <Link to="/promo/guide" style={{ textDecoration: 'none' }}><Card title="사용법 →" body="검색 조건 설정부터 결과 확인까지, 처음 사용자를 위한 가이드." /></Link>
        <Link to="/promo/blog" style={{ textDecoration: 'none' }}><Card title="블로그 →" body="전형 검색을 똑똑하게 활용하는 방법과 입시 전략 인사이트." /></Link>
      </Grid>
      <div style={{ textAlign: 'center' }}>
        <CTA href="/" label="지금 전형 검색하기" />
      </div>
    </PromoShell>
  );
}

// ───────── 사용법 ─────────
const STEPS = [
  { t: '1. 키워드 검색', b: '관심 대학명, 학과명 또는 전형명을 입력하고 검색을 누릅니다. 추천 검색어로 시작해도 좋아요.' },
  { t: '2. 검색 조건 좁히기', b: '모집 시기·교육과정·대학 소재지를 선택하세요. 모바일에서는 상세 조건의 필터 열기를 누릅니다.' },
  { t: '3. 전형 정보 확인', b: '결과 카드의 모집인원과 면접 여부를 확인하고, 원하는 순서로 정렬해 탐색하세요. 최종 전형 내용은 대학 공식 모집요강을 확인하세요.' },

];
function PromoGuide() {
  return (
    <PromoShell>
      <Hero badge="사용법 가이드" title="검색 3단계로 내 전형을 찾습니다" body="키워드 검색 → 조건 좁히기 → 정보 확인. 아래 순서대로 시작해 보세요." />
      <SectionTitle>빠른 시작</SectionTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {STEPS.map((s) => (
          <div key={s.t} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
            <strong style={{ color: INK, fontSize: 15 }}>{s.t}</strong>
            <p style={{ color: MUTED, fontSize: 14, margin: '6px 0 0', lineHeight: 1.65 }}>{s.b}</p>
          </div>
        ))}
      </div>
      <SectionTitle>활용 팁</SectionTitle>
      <Grid>
        <Card title="조건은 넓게 시작" body="처음엔 조건을 넓게 잡고 결과를 보며 점차 좁혀가는 편이 좋습니다." />
        <Card title="반영 과목을 확인" body="같은 계열도 반영 과목·비율이 달라 유불리가 갈립니다. 꼭 확인하세요." />
        <Card title="결과가 없다면 초기화" body="선택한 조건 옆의 ×로 하나씩 해제하거나, 초기화 버튼으로 전체 조건을 다시 설정하세요." />
      </Grid>
      <SectionTitle>자주 묻는 질문</SectionTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        <Card title="정시·수시 모두 검색되나요?" body="네. 등록된 수시·정시 전형을 함께 검색하거나 모집 시기로 구분해 볼 수 있습니다." />
        <Card title="정보 출처는 어디인가요?" body="공식 모집요강 등을 기반으로 하며, 최종 확인은 대학 공식 자료를 권장합니다." />
      </div>
      <div style={{ textAlign: 'center' }}>
        <CTA href="/" label="검색 시작하기" />
      </div>
    </PromoShell>
  );
}

// ───────── 블로그 ─────────
interface Post { title: string; category: string; date: string; excerpt: string; }
const POSTS: Post[] = [
  { title: '내 성적으로 갈 수 있는 전형, 검색으로 찾는 법', category: '전형 탐색', date: '2026-06-19', excerpt: '조건 검색과 필터로 나에게 맞는 전형을 효율적으로 좁히는 방법.' },
  { title: '같은 학과인데 왜 유불리가 다를까 — 반영 과목의 힘', category: '전형 분석', date: '2026-06-11', excerpt: '반영 과목·비율 차이가 합불을 가르는 이유와 비교 포인트.' },
  { title: '수시와 정시, 전형 검색으로 함께 저울질하기', category: '지원 전략', date: '2026-06-03', excerpt: '수시·정시 전형을 나란히 비교해 지원 조합을 설계하는 법.' },
  { title: 'AI 전형 조언, 어떻게 활용하면 좋을까', category: '활용법', date: '2026-05-26', excerpt: 'AI 조언을 참고 자료로 똑똑하게 쓰는 방법과 주의점.' },
];
function PromoBlog() {
  const [featured, ...rest] = POSTS;
  return (
    <PromoShell>
      <Hero badge="블로그 · 전형 인사이트" title="전형 검색을 똑똑하게 쓰는 법" body="복잡한 전형 정보를 검색·비교로 정리하는 노하우와 입시 전략 인사이트를 전합니다." />
      <div style={{ marginTop: 20, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 22 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{featured.category}</span>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: INK, margin: '8px 0' }}>{featured.title}</h2>
        <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.7 }}>{featured.excerpt}</p>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>{featured.date}</p>
      </div>
      <SectionTitle>최근 글</SectionTitle>
      <Grid>
        {rest.map((p) => (
          <div key={p.title} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{p.category}</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: INK, margin: '6px 0' }}>{p.title}</h3>
            <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.6 }}>{p.excerpt}</p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>{p.date}</p>
          </div>
        ))}
      </Grid>
    </PromoShell>
  );
}

export const promoIndexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/promo', component: PromoHome });
export const promoGuideRoute = createRoute({ getParentRoute: () => rootRoute, path: '/promo/guide', component: PromoGuide });
export const promoBlogRoute = createRoute({ getParentRoute: () => rootRoute, path: '/promo/blog', component: PromoBlog });
