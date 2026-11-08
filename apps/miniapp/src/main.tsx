import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './styles.css';

type IconName = 'home' | 'mission' | 'garden' | 'user' | 'arrow' | 'close';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H15v-7H9v7H3Z"/></>,
    mission: <><rect x="6" y="4" width="13" height="17" rx="3"/><path d="M9 4V2h7v2m-6 8 2 2 4-5"/></>,
    garden: <><path d="M12 21V11M12 15C5 15 3 10 4 7c6-1 9 2 8 8ZM12 11c0-6 3-8 8-7 1 4-2 8-8 7Z"/></>,
    user: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function Sprout() { return <svg className="sprout" viewBox="0 0 110 120" aria-hidden="true"><ellipse cx="55" cy="111" rx="33" ry="5" fill="#395738" opacity=".12"/><path d="M56 27V15" stroke="#369566" strokeWidth="5"/><ellipse cx="39" cy="15" rx="17" ry="8" fill="#369566" transform="rotate(15 39 15)"/><ellipse cx="69" cy="9" rx="17" ry="9" fill="#369566" transform="rotate(-15 69 9)"/><rect x="21" y="26" width="70" height="81" rx="31" fill="#89d299"/><ellipse cx="28" cy="106" rx="14" ry="6" fill="#89d299"/><ellipse cx="80" cy="106" rx="14" ry="6" fill="#89d299"/><circle cx="42" cy="64" r="3.5" fill="#223f35"/><circle cx="70" cy="64" r="3.5" fill="#223f35"/><path d="M47 80q9 11 18-1" fill="none" stroke="#223f35" strokeWidth="3" strokeLinecap="round"/></svg>; }
const entries = [
  { key: 'optimizer', title: '프롬프트 개선기', description: '내 질문 다듬기 · 예시와 팁' },
  { key: 'recommendation', title: 'AI 모델 추천', description: 'Light / Medium / High 비교' },
  { key: 'garden', title: '나의 정원', description: '캐릭터 선택 · 상점 · 친구 방문' },
];
type Modal = 'attendance' | 'tip' | 'game' | 'optimizer' | 'recommendation' | 'garden' | 'my' | null;
function App() {
  const [ep, setEp] = useState(125);
  const [claimed, setClaimed] = useState({ attendance: false, tip: false });
  const [modal, setModal] = useState<Modal>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (modal) { previousFocus.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); previousFocus.current?.focus(); }
  }, [modal]);
  function claim(kind: 'attendance' | 'tip') {
    if (claimed[kind]) return;
    setClaimed(current => ({ ...current, [kind]: true }));
    setEp(value => value + (kind === 'attendance' ? 5 : 3));
  }
  function attendance() { claim('attendance'); setModal('attendance'); }
  const titles: Record<Exclude<Modal, null>, string> = {
    attendance: '오늘 출석 완료!', tip: '오늘의 팁', game: '오늘 · 길 건너기',
    optimizer: '프롬프트 개선기', recommendation: 'AI 모델 추천', garden: '나의 정원', my: '마이',
  };
  return <div className="app-shell">
    <main className={modal ? 'home is-blurred' : 'home'}>
      <header className="brand-row"><h1>AIMI</h1><div className="ep-balance" aria-label={`보유 ${ep} EP`}><strong>{ep}</strong><span>EP</span></div></header>
      <p className="greeting">새싹이, 오늘도 한 판 어때요?</p>
      <button className="game-card" onClick={() => setModal('game')}>
        <span className="eyebrow">오늘 · 길 건너기</span><strong>게임으로 예산 모으기</strong>
        <span className="game-stats">남은 게임 4회<br/><b>최고 점수 180점</b></span><Sprout/><span className="game-arrow"><Icon name="arrow"/></span>
      </button>
      <div className="daily-actions">
        <button onClick={attendance}><strong>{claimed.attendance ? '출석 완료' : '출석하기'}</strong><span>오늘 보상</span></button>
        <button onClick={() => setModal('tip')}><strong>오늘의 팁</strong><span>{claimed.tip ? '오늘 보상 받음' : '누르고 보상받기'}</span></button>
      </div>
      <section className="feature-list" aria-label="학습 도구와 정원">{entries.map(item => <button className="feature" key={item.key} onClick={() => setModal(item.key as Modal)}><span><strong>{item.title}</strong><small>{item.description}</small></span><span className="chevron" aria-hidden="true">›</span></button>)}</section>
      <p className="preview-note">개발용 화면 미리보기 · 수치와 보상은 임시 데이터예요.</p>
    </main>
    <nav className="tab-bar" aria-label="하단 메뉴">{(['home', 'mission', 'garden', 'user'] as const).map((name, i) => <button key={name} aria-current={i === 0 ? 'page' : undefined} onClick={() => i === 0 ? window.scrollTo({ top: 0, behavior: 'smooth' }) : setModal(i === 1 ? 'game' : i === 2 ? 'garden' : 'my')}><Icon name={name}/><span>{['홈', '미션', '정원', '마이'][i]}</span></button>)}</nav>
    <dialog ref={dialog} className="modal" onCancel={event => { event.preventDefault(); setModal(null); }} onClick={event => { if (event.target === event.currentTarget) setModal(null); }} onClose={() => setModal(null)}>
      <div className="modal-heading"><h2>{modal ? titles[modal] : ''}</h2><button className="icon-button" aria-label="닫기" onClick={() => setModal(null)}><Icon name="close"/></button></div>
      {modal === 'attendance' ? <><p className="reward">+5 EP</p><p>오늘도 함께해줘서 고마워요.<br/>출석 보상이 지급됐어요.</p><button className="primary" onClick={() => setModal(null)}>확인</button></> : modal === 'tip' ? <><p>원하는 대상과 조건을 구체적으로!<br/>예: “사과”보다 “빨간 사과 두 개”처럼 필요한 정보를 알려주세요.</p><div className="tip-reward"><strong>팁 확인 보상 +3 EP</strong><p>새로운 작성법을 하나 배웠어요!</p></div><button className="primary" onClick={() => { claim('tip'); setModal(null); }}>{claimed.tip ? '확인' : '확인하고 보상받기'}</button></> : <><p>이 기능은 다음 개발 단계에서 연결해요.</p><p className="muted">지금은 최신 UX의 홈 화면과 보상 팝업만 미리 볼 수 있어요. 게임·로그인·실제 EP 저장·AI 호출은 아직 연결하지 않았어요.</p><button className="primary" onClick={() => setModal(null)}>홈으로</button></>}
    </dialog>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
