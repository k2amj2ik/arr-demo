# ARR Demo — 추급권 정산 플랫폼 데모

서울옥션블루 내부 시연용 추급권(Artist's Resale Right) 정산 플랫폼 MVP 데모. 서버 없이 브라우저만으로 작동하는 정적 웹앱.

## Commands

| Command | Description |
|---------|-------------|
| `python -m http.server 8765` | 데모 서버 실행 (이 폴더에서) |
| 브라우저 `http://localhost:8765` | 데모 접속 |

빌드/설치 불필요 — HTML + CDN(Tailwind, Chart.js, html2pdf.js)만 사용.

## Architecture

```
demo/
  index.html           # 대시보드 — 통계 카드, 차트, 최근 거래
  calculator.html      # 추급권 계산기 — 판별(A-01) + 계산(A-02)
  transactions.html    # 거래 관리 — 목록, 필터, 인보이스(A-03), 신고서(A-04)
  consignment.html     # 위탁 안내 — 3단계 시뮬레이션(A-05), 안내문 PDF
  artists.html         # 작가 DB — 25명 검색/상세(A-06)
  settings.html        # 관리자 설정 — 비율 구간/상한 변경(A-08)
  js/
    arr-engine.js      # 핵심 엔진 — 판별, 계산, 인보이스, 신고서, 시뮬레이션
    app.js             # 공통 — 네비게이션, 모달, 배지, CSV/PDF, 데이터 로드
  data/
    artists.json       # 작가 25명 (한국 15 + 해외 10, 생존/사망/만료 혼합)
    transactions.json  # 거래 50건 (500만~132억, 적용/미적용/최초판매 혼합)
    settings.json      # 비율 5구간, 최소금액, 상한, BP비율, 존속기간
```

## Key Files

- `js/arr-engine.js` — 모든 비즈니스 로직 집중. `checkEligibility()`, `calculateRoyalty()`, `generateInvoice()`, `generateReport()`, `simulateConsignment()`
- `js/app.js` — `loadData()`로 JSON 로드 → `initPage()` 호출하는 초기화 패턴. 모든 HTML이 이 패턴을 따름
- `data/settings.json` — `rateBrackets` 배열이 누진 비율 구간 정의. 관리자 설정 페이지에서 런타임 변경 가능 (새로고침 시 원복)

## Code Style

- 순수 JavaScript (프레임워크 없음), CDN 라이브러리만 사용
- 각 HTML 파일이 독립적 페이지 — `<script>` 태그 안에 페이지별 로직 인라인
- 공통 함수는 `arr-engine.js`와 `app.js`에 전역 함수로 노출
- 금액 표시: `formatKRW()` — 억/만원 단위 자동 변환 (예: 132억원, 5,000만원)

## Testing

- `python -m http.server 8765`로 서버 실행 후 Playwright로 검증
- 핵심 검증: 5,000만원 입력 → 추급권료 **1,130,000원** (300만×4% + 2,700만×3% + 2,000만×1%)
- 나혜석(1948년 사망) → 사후 77년 → **만료** 표시 확인
- 권오상 "New Structure 2027" → **최초 판매 미적용** 확인

## Gotchas

- **시행령 미확정** — `settings.json`의 비율은 EU 기준 참고값. 시행령 확정 시 변경 필요
- **데이터 비영속** — 관리자 설정 변경은 메모리에서만 유지, 새로고침 시 JSON 원본으로 복원
- **file:// 불가** — JSON fetch 때문에 반드시 HTTP 서버로 접근해야 함 (`python -m http.server`)
- **CDN 의존** — Tailwind, Chart.js, html2pdf.js를 CDN에서 로드하므로 인터넷 필요
- 이중섭(1956년 사망)은 사후 69년으로 아직 **존속** — 2026년 기준 경계 케이스

## Workflow

- 기능 추가 시: `arr-engine.js`에 로직 → HTML에 UI → `data/`에 샘플 데이터
- 비율 변경 테스트: `settings.html` 관리자 설정 → 실시간 계산 테스트 패널에서 확인
- PDF 기능: `generatePDF(elementId, filename)` 호출 — html2pdf.js가 해당 DOM을 PDF로 변환
