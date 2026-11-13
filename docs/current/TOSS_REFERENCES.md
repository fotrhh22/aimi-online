# 앱인토스 공식 구현 자료

2026-11-08 확인. 최신 SDK 설치 타입도 함께 확인한다. UI 일부가 공식 TDS라는 의미로 이 링크만 붙이지 않는다.

| 목적 | 공식 링크 |
|---|---|
| 전체 문서 | https://developers-apps-in-toss.toss.im/ |
| AI용 색인 | https://developers-apps-in-toss.toss.im/llms.txt |
| WebView SDK 설치·초기화 | https://developers-apps-in-toss.toss.im/tutorials/webview.html |
| SDK 시작 | https://developers-apps-in-toss.toss.im/documentation/integration/getting-started.md |
| SDK 3.x | https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x.md |
| UI/UX 기준 | https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md |
| TDS 개요 | https://developers-apps-in-toss.toss.im/design/components.md |
| TDS WebView 컴포넌트 | https://tossmini-docs.toss.im/tds-mobile/ |
| Figma 디자인 도구 | https://developers-apps-in-toss.toss.im/design/prepare/design.md |
| 토스 로그인 | https://developers-apps-in-toss.toss.im/guide/authentication/intro.md |
| 서버 API 연동 | https://developers-apps-in-toss.toss.im/documentation/integration/server-api.md |
| 공식 공유 예제 | https://github.com/toss/apps-in-toss-examples/tree/main/growth |
| 클립보드 SDK | https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/clipboard.md |
| Supabase 연동 | https://developers-apps-in-toss.toss.im/ai-vibe-coding/integration/supabase.md |
| 게임 출시 기준 | https://developers-apps-in-toss.toss.im/checklist/app-game.md |
| 비게임 출시 기준 | https://developers-apps-in-toss.toss.im/checklist/app-nongame.md |
| 샌드박스 | https://developers-apps-in-toss.toss.im/development/test/sandbox.md |
| 실제 토스 테스트 | https://developers-apps-in-toss.toss.im/guide/operation/toss.md |
| 배포·버전 관리 | https://developers-apps-in-toss.toss.im/guide/operation/deploy.md |

## 현재 설치·설정

`@apps-in-toss/web-framework` **3.10.0**을 설치하고 실제 `dist/config.d.ts`를 확인했다. 설정 파일은 `apps-in-toss.config.ts`, 빌드 경로 필드는 `webBundleDir`, CLI는 `ait build`다. `granite.config.ts`, `web.commands`를 사용하는 2.x 자료와 섞지 않는다.

홈은 `navigationBar.withBackButton=false`, `withTitle=false`다. 세부 화면에서는 SDK의 실제 내비게이션 API를 연동해야 한다. 현재 CSS 탭·팝업은 로컬 대체 UI다.

공식 TDS 설치 가이드의 패키지: `@toss/tds-mobile`, `@toss/tds-mobile-ait`, `@emotion/react`. 이번 초기 화면에는 아직 설치·Provider 적용하지 않았다. 디자인과 기본 화면을 먼저 분리해 둔 상태다.

AIMI는 게임·AI 학습 기능이 함께 있으므로 게임/비게임 분류를 확정하기 전에 어느 한쪽 검수 통과를 단정하지 않는다. SDK 설정·번들 생성 성공도 실제 토스 로그인·공유·검수 완료와는 별개다.

## 최종 산출물·인수 기준 보강

2026-11-08 공식 UI/UX·TDS·게임/비게임 출시·테스트 가이드를 재확인했다. TOSS_DELIVERY_AND_ACCEPTANCE.md에 .ait/API/DB 산출물과 Phase1/12 검증 기준을 명시했다. 실제 TDS는 아직 미설치이며 공식 가이드 확인과 실제 준수 완료를 구분한다.
