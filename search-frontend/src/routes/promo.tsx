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
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 20px 56px', fontFamily: "system-ui, -apple-system, 'Malgun Gothic', sans-serif" }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link to="/promo" style={{ fontWeight: 800, fontSize: 18, color: INK, textDecoration: 'none' }}>
          입시 전형 검색
        </Link>
        <a href="/" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: ACCENT, padding: '8px 16px', borderRadius: 10, textDecoration: 'none' }}>
          검색 시작
        </a>
      </header>
      <nav style={{ display: 'flex', gap: 8, padding: '10px 0', borderBottom: `1px solid ${BORDER}`, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', color: MUTED, border: `1px solid ${BORDER}`, background: CARD }}
            activeProps={{ style: { color: '#fff', background: ACCENT, border: `1px solid ${ACCENT}` } }}
            activeOptions={{ exact: t.to === '/promo' }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
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
        body="대학·전형·계열·과목 조건으로 전국 전형을 통합 검색하고, 조건에 맞는 전형만 추려 비교합니다. AI가 내 조건에 맞는 전형 전략까지 조언해 드립니다."
      />
      <SectionTitle>핵심 기능</SectionTitle>
      <Grid>
        <Card title="통합 전형 검색" body="대학·전형 유형·계열·반영 과목 등 조건으로 전국 전형을 한 번에 검색합니다." />
        <Card title="조건 필터·비교" body="내 성적·관심 조건에 맞는 전형만 필터링하고 나란히 비교합니다." />
        <Card title="AI 전형 조언" body="검색 결과를 바탕으로 내 조건에 유리한 전형 전략을 AI가 제안합니다." />
        <Card title="전형 상세 정보" body="모집인원·전형방법·반영비율 등 핵심 정보를 한 화면에서 확인합니다." />
      </Grid>
      <SectionTitle>더 알아보기</SectionTitle>
      <Grid>
        <Card title="사용법 →" body="검색 조건 설정부터 결과 비교까지, 처음 사용자를 위한 가이드." />
        <Card title="블로그 →" body="전형 검색을 똑똑하게 활용하는 방법과 입시 전략 인사이트." />
      </Grid>
      <div style={{ textAlign: 'center' }}>
        <CTA href="/" label="지금 전형 검색하기" />
      </div>
    </PromoShell>
  );
}

// ───────── 사용법 ─────────
const STEPS = [
  { t: '1. 검색 조건 입력', b: '관심 대학·전형 유형·계열·반영 과목 등 조건을 입력합니다.' },
  { t: '2. 결과 필터링', b: '내 성적·조건에 맞게 결과를 좁혀 나에게 맞는 전형만 남깁니다.' },
  { t: '3. 전형 비교', b: '후보 전형을 나란히 비교해 모집인원·반영비율 등을 확인합니다.' },
  { t: '4. AI 조언 확인', b: '검색 결과 기반으로 유리한 전형 전략 조언을 받아 참고합니다.' },
];
function PromoGuide() {
  return (
    <PromoShell>
      <Hero badge="사용법 가이드" title="검색 3단계로 내 전형을 찾습니다" body="조건 입력 → 필터 → 비교. 아래 순서만 따라오면 됩니다." />
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
        <Card title="AI 조언은 참고용" body="AI 조언은 추정 기반입니다. 최종 판단 전 공식 모집요강을 확인하세요." />
      </Grid>
      <SectionTitle>자주 묻는 질문</SectionTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        <Card title="정시·수시 모두 검색되나요?" body="네. 수시·정시 전형을 유형별로 통합 검색·비교할 수 있습니다." />
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
