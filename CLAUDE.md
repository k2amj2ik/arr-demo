# 추급권 정산 플랫폼 데모

서울옥션블루 내부 시연용 추급권(Artist's Resale Right) 정산 플랫폼 MVP 데모. 서버 없이 브라우저만으로 작동하는 정적 웹앱.

- 배포: https://k2amj2ik.github.io/artist-fee-demo/
- GitHub: https://github.com/k2amj2ik/artist-fee-demo

## Commands

| Command | Description |
|---------|-------------|
| `python -m http.server 8765` | 로컬 데모 서버 실행 (이 폴더에서) |
| 브라우저 `http://localhost:8765` | 로컬 데모 접속 |

빌드/설치 불필요 — HTML + CDN(Tailwind, Chart.js, html2pdf.js)만 사용.

## Architecture

```text
demo/
  process.html         # 프로세스 흐름도 — 9역할 × 7단계 다이어그램
  index.html           # 대시보드 — 통계 카드, 차트, 최근 거래
  calculator.html      # 비용 계산기 — 판별(A-01) + 계산(A-02) + 인보이스(A-03) + 위탁 시뮬레이션(A-05) 통합
  transactions.html    # 거래 관리 — 목록, 필터, 인보이스, 신고서 + "거래 등록하기" 버튼
  register.html        # 거래 등록 — 갤러리 웹콘솔(직접 입력) / 서울옥션 API(자동 연동) 2채널
  artists.html         # 작가 DB — 25명 검색/상세 + "작가 추가" 기능
  settings.html        # 관리자 설정 — 비율 구간/상한 변경(A-08)
  logo.png             # SAB 로고
  js/
    arr-engine.js      # 핵심 엔진 — 판별, 계산, 인보이스, 신고서, 시뮬레이션
    app.js             # 공통 — 네비게이션, 역할 권한, 모달, 배지, CSV/PDF, 데이터 로드
  data/
    artists.json       # 작가 25명 (한국 15 + 해외 10, 생존/사망/만료 혼합)
    transactions.json  # 거래 50건 (500만~132억, 적용/미적용/최초판매 혼합)
    settings.json      # 비율 5구간, 최소금액, 상한, BP비율, 존속기간
```

## Key Files

- `js/arr-engine.js` — 모든 비즈니스 로직 집중. `checkEligibility()`, `calculateRoyalty()`, `generateInvoice()`, `generateReport()`, `simulateConsignment()`
- `js/app.js` — `loadData()`로 JSON 로드 → `initPage()` 호출하는 초기화 패턴. 역할 권한 시스템(`ROLES`, `ROLE_PAGES`, `ROLE_ACTIONS`) 포함
- `data/settings.json` — `rateBrackets` 배열이 누진 비율 구간 정의. 관리자 설정 페이지에서 런타임 변경 가능 (새로고침 시 원복)

## Code Style

- 순수 JavaScript (프레임워크 없음), CDN 라이브러리만 사용
- 각 HTML 파일이 독립적 페이지 — `<script>` 태그 안에 페이지별 로직 인라인
- 공통 함수는 `arr-engine.js`와 `app.js`에 전역 함수로 노출
- 금액 표시: `formatKRW()` — 억/만원 단위 자동 변환 (예: 132억원, 5,000만원)
- 권한 체크: `hasPageAccess(pageId)`, `hasAction(action)` — 역할별 메뉴/버튼 표시 제어

## Testing

- `python -m http.server 8765`로 서버 실행 후 Playwright로 검증
- 핵심 검증: 5,000만원 입력 → 추급권료 **1,130,000원** (300만×4% + 2,700만×3% + 2,000만×1%)
- 나혜석(1948년 사망) → 사후 77년 → **만료** 표시 확인
- 권오상 "New Structure 2027" → **최초 판매 미적용** 확인
- 역할 전환: 드롭다운에서 갤러리→작가로 변경 시 메뉴/버튼 자동 변경 확인

## Gotchas

- **시행령 미확정** — `settings.json`의 비율은 EU 기준 참고값. 시행령 확정 시 변경 필요
- **데이터 비영속** — 거래 등록, 작가 추가, 설정 변경은 메모리에서만 유지. 새로고침 시 JSON 원본으로 복원
- **file:// 불가** — JSON fetch 때문에 반드시 HTTP 서버로 접근해야 함 (`python -m http.server`)
- **CDN 의존** — Tailwind, Chart.js, html2pdf.js를 CDN에서 로드하므로 인터넷 필요
- **consignment.html** — 비용 계산기에 통합되어 메뉴에서 제거됨. 파일은 남아있으나 미사용
- 이중섭(1956년 사망)은 사후 69년으로 아직 **존속** — 2026년 기준 경계 케이스
- **역할 저장** — `localStorage`에 저장되므로 브라우저별로 다른 역할이 보일 수 있음

## Workflow

- 기능 추가 시: `arr-engine.js`에 로직 → HTML에 UI → `data/`에 샘플 데이터
- 페이지 추가 시: `app.js`의 `allPages` + `ROLE_PAGES` + `ROLE_ACTIONS`에 등록
- 비율 변경 테스트: `settings.html` 관리자 설정 → 실시간 계산 테스트 패널에서 확인
- PDF 기능: `generatePDF(elementId, filename)` 호출 — html2pdf.js가 해당 DOM을 PDF로 변환
- 배포: `git push origin main` → GitHub Pages 자동 배포
