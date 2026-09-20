import { Link } from '@tanstack/react-router';
import { Icon } from './icon';

export function AppHeader() {
  return <>
    <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="app-brand" aria-label="T검색 홈"><img src="https://www.tskool.kr/logo.png" alt="티스쿨 로고" width={38} height={38} /><span>T검색<small>by T스쿨</small></span></Link>
        <nav className="app-nav" aria-label="주 메뉴">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'active', 'aria-current': 'page' }}>전형 검색</Link>
          <Link to="/promo" activeOptions={{ exact: true }} activeProps={{ className: 'active', 'aria-current': 'page' }}>서비스 소개</Link>
          <Link to="/promo/guide" activeProps={{ className: 'active', 'aria-current': 'page' }}>이용 가이드</Link>
        </nav>
        <a className="hub-link" href="https://www.tskool.kr/auth/login"><Icon name="grid" size={17} /><span>내 계정 · 로그인</span><Icon name="arrow" size={16} /></a>
      </div>
    </header>
  </>;
}
