# AIMI API 개발 배포

검증일: 2026-11-08, Asia/Seoul.

- GitHub: https://github.com/fotrhh22/aimi-online
- API: https://aimi-online-api.onrender.com
- Render: https://dashboard.render.com/web/srv-dbo2dvp5efls73cmt7qg
- 런타임: Node 22.22.0 / Singapore / Free 개발용 Web Service
- Build: `npm ci && npm run build:api`
- Start: `npm run start:api`
- main 변경 시 자동 배포. 문서만 바꿀 때 `[skip render]`를 사용하면 불필요한 배포를 피할 수 있다.

## 연결 확인

브라우저에서 `/health/live`는 서버 상태, `/health/ready`는 DB/migration 준비 상태를 확인한다. 실제 검증에서 모두 200을 반환했다. 지갑은 세션 없이 401이며 개발용 로그인은 배포에서 404다.

Render의 플랫폼 검사는 현재 기본 TCP다. HTTP DB readiness를 플랫폼 검사로 사용하려면 Dashboard → Settings → Health Checks에서 `/health/ready`로 지정한다. Free 서비스는 유휴 시 중지되므로 개발 검증용이다.

## 로컬 실행

```sh
cd /Users/hunhokang/Downloads/esg_campaign/aimi-online
npm ci
npm run build:api
npm run start:api
```

로컬 API는 기본 `http://127.0.0.1:8080`이다. `apps/api/.env.local`의 `DATABASE_URL`은 생성된 API 전용 DB 역할이고 `MIGRATION_DATABASE_URL`은 관리자 연결이다. 역할 분리 이후의 현재 값을 유지한다. migration 적용은 `npm run db:migrate`, 실제 DB 거래 검증은 `npm run test:db`다. 관리자 키는 배포 서버·GitHub CI에 전달하지 않는다.

## 완료 범위

CI·DB migration·세션 기반 API·개발 경제 정책·배포 기반을 검증했다. 미니앱은 아직 데모 화면이며 API에 연결되지 않았다. 토스 로그인, 실제 게임·챌린지·상점, 개선기/추천 API와 모델 데이터 수집은 후속 작업이다. 확정 Gemini 모델의 합성 호출은 성공했지만 개선기 제품 기능이 구현됐다는 뜻은 아니다.
