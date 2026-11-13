# Vercel / AIT UI change audit — 2026-11-13

## Findings

- Both builds use the same React screens and CSS. There is no separate Vercel UI branch in the local repository.
- Commit a860197 gated TDS for the web demo and moved page titles into scrolling content. The common title scrolling and native fallback button alignment rules are present in archived Toss bundles, not omitted wholesale.
- Commit d976e51 removed the mascot only from the loading-screen branch. The login-screen branch still rendered the seed character. This was an incomplete implementation across startup states, not evidence of an old bundle alone. Both startup screens now use the large logo without a character.
- The old page-direct-child mission image rule no longer matched the nested mission screen. Commit 0610a12 also added a mission image max-height clamp. This shared CSS regression affected both runtimes. The mission image now uses the full content width and original aspect ratio without the height cap.
- The common image badge now reads AI 생성 이미지.

## Artifact evidence

`output/qa/vercel-ait-parity/bundles.json` records four inspected AIT files, deployment IDs, hashes and code/CSS markers. Before the final startup-character correction, AIMI_FINAL.ait's three HTML/JS/CSS entries matched the built dist byte for byte and included the mission image correction. The missing startup-character removal was in the source itself, so bundle byte equality alone was insufficient.

The filename AIMI_FINAL.ait has been reused. Console-uploaded and local copies must be compared by deployment ID/hash, not filename. This audit did not access or change the already-submitted console bundle.

## Intentional runtime differences

Toss uses TDS and native navigation/share/auth/safe-area APIs. Local/web builds use browser fallbacks. Retired Vercel access-code accounts, proxy and demo reset controls are not to be copied into the production Toss build. This work does not reopen the Vercel service.
