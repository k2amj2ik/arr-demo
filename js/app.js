/**
 * App.js — 공통 로직 (네비게이션, 레이아웃, 유틸리티)
 */

// ── 네비게이션 ──────────────────────────────
function getNavHTML(activePage) {
  const pages = [
    { id: 'index', label: '대시보드', icon: '📊', href: 'index.html' },
    { id: 'calculator', label: '추급권 계산기', icon: '🧮', href: 'calculator.html' },
    { id: 'register', label: '거래 등록', icon: '➕', href: 'register.html' },
    { id: 'transactions', label: '거래 관리', icon: '📋', href: 'transactions.html' },
    { id: 'consignment', label: '위탁 안내', icon: '📝', href: 'consignment.html' },
    { id: 'artists', label: '작가 DB', icon: '🎨', href: 'artists.html' },
    { id: 'settings', label: '관리자 설정', icon: '⚙️', href: 'settings.html' }
  ];

  return `
    <nav class="bg-slate-800 text-white">
      <div class="max-w-7xl mx-auto px-4">
        <!-- 데모 배너 -->
        <div class="bg-amber-500 text-slate-900 text-center text-sm font-medium py-1 -mx-4 px-4">
          DEMO — 추급권 정산 플랫폼 내부 시연용 (시행령 미확정, EU 기준 참고)
        </div>
        <!-- 헤더 -->
        <div class="flex items-center justify-between py-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-teal-500 rounded flex items-center justify-center font-bold text-sm">ARR</div>
            <div>
              <div class="font-bold text-lg leading-tight">추급권 정산 플랫폼</div>
              <div class="text-xs text-slate-400">Seoul Auction Blue</div>
            </div>
          </div>
          <div class="text-xs text-slate-400">시행 예정: 2027.10.23</div>
        </div>
        <!-- 메뉴 -->
        <div class="flex gap-1 -mb-px overflow-x-auto">
          ${pages.map(p => `
            <a href="${p.href}"
               class="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-t-lg whitespace-nowrap transition
                      ${p.id === activePage
                        ? 'bg-white text-slate-800 font-semibold'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'}">
              <span>${p.icon}</span>
              <span>${p.label}</span>
            </a>
          `).join('')}
        </div>
      </div>
    </nav>
  `;
}

function renderNav(activePage) {
  const navContainer = document.getElementById('nav');
  if (navContainer) navContainer.innerHTML = getNavHTML(activePage);
}

// ── 페이지 레이아웃 ──────────────────────────
function getPageShell(activePage, title, content) {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} — 추급권 정산 플랫폼</title>
      <script src="https://cdn.tailwindcss.com"><\/script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
    </head>
    <body class="bg-gray-50 min-h-screen">
      <div id="nav"></div>
      <main class="max-w-7xl mx-auto px-4 py-6">${content}</main>
      <script src="js/arr-engine.js"><\/script>
      <script src="js/app.js"><\/script>
    </body>
    </html>
  `;
}

// ── 통계 카드 컴포넌트 ────────────────────────
function statCard(label, value, sub, color = 'teal') {
  const colors = {
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700'
  };
  return `
    <div class="border rounded-xl p-5 ${colors[color] || colors.teal}">
      <div class="text-sm font-medium opacity-70">${label}</div>
      <div class="text-2xl font-bold mt-1">${value}</div>
      ${sub ? `<div class="text-xs mt-1 opacity-60">${sub}</div>` : ''}
    </div>
  `;
}

// ── 배지 컴포넌트 ──────────────────────────────
function badge(text, type = 'default') {
  const styles = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    default: 'bg-gray-100 text-gray-700 border-gray-200'
  };
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.default}">${text}</span>`;
}

function statusBadge(status) {
  const map = {
    '납부완료': badge('납부완료', 'success'),
    '신고완료': badge('신고완료', 'info'),
    '미신고': badge('미신고', 'warning'),
    '미적용': badge('미적용', 'default')
  };
  return map[status] || badge(status);
}

function eligibilityBadge(eligible) {
  return eligible
    ? badge('추급권 적용', 'success')
    : badge('미적용', 'default');
}

// ── 모달 ──────────────────────────────────────
function showModal(title, content) {
  const existing = document.getElementById('modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 class="text-lg font-bold text-slate-800">${title}</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
      </div>
      <div class="px-6 py-4">${content}</div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.remove();
}

// ── 엑셀 다운로드 (CSV) ──────────────────────
function downloadCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    '\uFEFF' + headers.join(','),
    ...data.map(row => headers.map(h => {
      let val = row[h];
      if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
      return val;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ── PDF 생성 (html2pdf.js) ────────────────────
function generatePDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (typeof html2pdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => doPDF(element, filename);
    document.head.appendChild(script);
  } else {
    doPDF(element, filename);
  }
}

function doPDF(element, filename) {
  html2pdf().set({
    margin: 10,
    filename: filename,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(element).save();
}

// ── 초기화 ────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  const page = document.body.dataset.page || 'index';
  renderNav(page);
  if (typeof initPage === 'function') initPage();
});
