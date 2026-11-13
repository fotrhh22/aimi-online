<p align="center"><img src="apps/miniapp/public/content/brand/aimi-logo-dark-transparent.png" alt="AIMI" width="180" /></p>

# AIMI

**매일 쌓이는 나의 AI 감각**

이미지 속 키워드를 찾으며 프롬프트를 배우고, 질문을 다듬고, 작업에 맞는 AI 모델을 비교하는 앱인토스 미니앱입니다.

**앱인토스 배포 완료 · 2026-11-13 기준**

## 주요 기능

- 이미지 챌린지와 일별 프롬프트 해설
- 프롬프트 개선·확장·구절별 작성 팁
- 텍스트·이미지·영상 AI 모델 비교와 추천
- 미니게임 3종·출석·오늘의 팁·EP
- 정원 꾸미기·아이템/캐릭터 상점·친구 정원 방문
- 닉네임·계정 관리·앱 내부 개인정보처리방침

## 구성·사용 서비스

React·TypeScript·Vite / Canvas 2D / Fastify·Zod / npm workspaces.

| 서비스 | 역할 |
| --- | --- |
| 앱인토스 | 미니앱 배포·익명 사용자 식별·공유 |
| Render | 백엔드 API |
| Supabase | PostgreSQL·Storage |
| Google Gemini | 프롬프트 개선·업무 분석 |
| OpenRouter·Artificial Analysis | 모델 가격·기능·성능 자료 |

이미지 챌린지는 미리 제작한 이미지를 사용하고 서버 규칙으로 판정합니다. EP는 정원용 재화이며 챌린지 예산과 별개입니다.

## 개발·운영 문서

- [현재 상태·문서 목록](docs/README.md)
- [로컬 실행·환경변수](docs/current/DEVELOPMENT.md)
- [코드·데이터 구조](docs/current/PROJECT_STRUCTURE.md)
- [운영 업데이트](docs/current/DEPLOYMENT.md)

운영자: Hunho Kang(강훈호) · 문의: **fotrhh22@gmail.com**

외부 자료 출처는 [라이선스 기록](assets/licenses/README.md)에 있습니다. 저장소 전체에 대한 별도 공개 사용 라이선스는 선언하지 않았습니다.
