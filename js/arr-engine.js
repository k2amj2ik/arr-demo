/**
 * ARR Engine — 추급권(Artist's Resale Right) 판별 및 계산 핵심 엔진
 */

// ── 설정 로드 ──────────────────────────────
let ARR_SETTINGS = null;
let ARTISTS_DATA = [];
let TRANSACTIONS_DATA = [];

async function loadData() {
  const [settingsRes, artistsRes, transactionsRes] = await Promise.all([
    fetch('data/settings.json'),
    fetch('data/artists.json'),
    fetch('data/transactions.json')
  ]);
  ARR_SETTINGS = await settingsRes.json();
  ARTISTS_DATA = await artistsRes.json();
  TRANSACTIONS_DATA = await transactionsRes.json();
  return { settings: ARR_SETTINGS, artists: ARTISTS_DATA, transactions: TRANSACTIONS_DATA };
}

function getSettings() {
  return ARR_SETTINGS;
}

function updateSettings(newSettings) {
  ARR_SETTINGS = { ...ARR_SETTINGS, ...newSettings };
  ARR_SETTINGS.updatedAt = new Date().toISOString().slice(0, 10);
}

// ── A-01: 추급권 해당 여부 자동 판별 ──────────
function checkEligibility(transaction, artist) {
  const checks = [];
  const today = new Date();

  // 1. 재판매 여부
  checks.push({
    label: '재판매 여부',
    pass: !transaction.isFirstSale,
    reason: transaction.isFirstSale ? '최초 판매 — 추급권 미적용' : '재판매 거래'
  });

  // 2. 전문 거래업자 관여
  const proTypes = ['경매', '갤러리', '아트페어'];
  const isPro = proTypes.includes(transaction.buyerType);
  checks.push({
    label: '전문 거래업자 관여',
    pass: isPro,
    reason: isPro ? `${transaction.buyerType} 관여` : '개인 간 사적 거래'
  });

  // 3. 최소 금액 기준
  const minPrice = ARR_SETTINGS.minimumPrice || 0;
  checks.push({
    label: '최소 금액 기준',
    pass: transaction.salePrice >= minPrice,
    reason: transaction.salePrice >= minPrice
      ? `${formatKRW(transaction.salePrice)} ≥ ${formatKRW(minPrice)}`
      : `${formatKRW(transaction.salePrice)} < ${formatKRW(minPrice)} (기준 미달)`
  });

  // 4. 저작재산권 존속
  let copyrightValid = true;
  let copyrightReason = '';
  if (artist) {
    if (artist.death) {
      const deathDate = new Date(artist.death);
      const yearsAfterDeath = (today - deathDate) / (365.25 * 24 * 60 * 60 * 1000);
      const duration = ARR_SETTINGS.copyrightDuration || 70;
      copyrightValid = yearsAfterDeath <= duration;
      copyrightReason = copyrightValid
        ? `사후 ${Math.floor(yearsAfterDeath)}년 (${duration}년 이내)`
        : `사후 ${Math.floor(yearsAfterDeath)}년 — ${duration}년 초과로 만료`;
    } else {
      copyrightReason = '작가 생존 중';
    }
  } else {
    copyrightReason = '작가 정보 없음 (확인 필요)';
  }
  checks.push({
    label: '저작재산권 존속',
    pass: copyrightValid,
    reason: copyrightReason
  });

  // 5. 예외 해당 여부 (데모에서는 단순 처리)
  checks.push({
    label: '적용 예외 해당 없음',
    pass: true,
    reason: '예외 사항 해당 없음'
  });

  const eligible = checks.every(c => c.pass);
  return { eligible, checks };
}

// ── A-02: 추급권료 자동 계산 ──────────────────
function calculateRoyalty(salePrice) {
  const brackets = ARR_SETTINGS.rateBrackets;
  const details = [];
  let totalRoyalty = 0;
  let remaining = salePrice;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketMin = bracket.min;
    const bracketMax = bracket.max !== null ? bracket.max : Infinity;
    const bracketSize = bracketMax - bracketMin;
    const taxable = Math.min(remaining, bracketSize);

    if (salePrice > bracketMin) {
      const amount = taxable * bracket.rate;
      totalRoyalty += amount;
      details.push({
        label: bracket.label,
        rate: bracket.rate,
        ratePercent: (bracket.rate * 100).toFixed(1) + '%',
        base: taxable,
        amount: amount
      });
      remaining -= taxable;
    }
  }

  // 상한 체크
  const maxRoyalty = ARR_SETTINGS.maximumRoyalty;
  const capped = maxRoyalty !== null && totalRoyalty > maxRoyalty;
  if (capped) totalRoyalty = maxRoyalty;

  return {
    salePrice,
    totalRoyalty: Math.round(totalRoyalty),
    effectiveRate: salePrice > 0 ? (totalRoyalty / salePrice * 100).toFixed(2) : '0',
    details,
    capped,
    maxRoyalty
  };
}

// ── A-03: 인보이스 데이터 생성 ──────────────────
function generateInvoice(transaction, royaltyResult) {
  const bpRate = ARR_SETTINGS.buyerPremiumRate || 0.15;
  const buyerPremium = Math.round(transaction.salePrice * bpRate);
  return {
    invoiceNo: `INV-${transaction.saleDate.replace(/-/g, '')}-${transaction.id}`,
    date: transaction.saleDate,
    artist: transaction.artistName,
    title: transaction.title,
    medium: transaction.medium,
    year: transaction.year,
    salePrice: transaction.salePrice,
    buyerPremium: buyerPremium,
    buyerPremiumRate: bpRate,
    arrRoyalty: royaltyResult.totalRoyalty,
    arrRate: royaltyResult.effectiveRate,
    total: transaction.salePrice + buyerPremium + royaltyResult.totalRoyalty,
    venue: transaction.venue,
    legalNote: '추급권료는 저작권법 제14조의2에 따라 저작권단체에 납부됩니다.'
  };
}

// ── A-04: 거래 신고서 데이터 생성 ────────────────
function generateReport(transaction, artist, royaltyResult) {
  return {
    reportNo: `RPT-${transaction.saleDate.replace(/-/g, '')}-${transaction.id}`,
    reportDate: new Date().toISOString().slice(0, 10),
    artwork: {
      title: transaction.title,
      artist: transaction.artistName,
      year: transaction.year,
      medium: transaction.medium
    },
    transaction: {
      salePrice: transaction.salePrice,
      saleDate: transaction.saleDate,
      venue: transaction.venue,
      saleType: transaction.saleType
    },
    artist: artist ? {
      name: artist.name,
      birth: artist.birth,
      death: artist.death,
      nationality: artist.nationality
    } : null,
    royalty: {
      amount: royaltyResult.totalRoyalty,
      effectiveRate: royaltyResult.effectiveRate,
      details: royaltyResult.details
    },
    legalBasis: '저작권법 제14조의2 (추급권)',
    status: '신고 대기'
  };
}

// ── A-05: 위탁자 안내 시뮬레이션 ────────────────
function simulateConsignment(artistId, estimateLow, estimateMid, estimateHigh) {
  const artist = ARTISTS_DATA.find(a => a.id === artistId);
  const scenarios = [
    { label: '저가 시나리오', price: estimateLow },
    { label: '중가 시나리오', price: estimateMid },
    { label: '고가 시나리오', price: estimateHigh }
  ];
  return scenarios.map(s => {
    const royalty = calculateRoyalty(s.price);
    const eligible = artist ? checkEligibility({ isFirstSale: false, buyerType: '경매', salePrice: s.price }, artist) : null;
    return {
      ...s,
      royalty: royalty.totalRoyalty,
      effectiveRate: royalty.effectiveRate,
      eligible: eligible ? eligible.eligible : true,
      details: royalty.details
    };
  });
}

// ── 유틸리티 ──────────────────────────────────
function formatKRW(amount) {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

function formatNumber(num) {
  return num.toLocaleString('ko-KR');
}

function getArtistById(id) {
  return ARTISTS_DATA.find(a => a.id === id);
}

function searchArtists(query) {
  const q = query.toLowerCase();
  return ARTISTS_DATA.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.nameEn.toLowerCase().includes(q) ||
    a.field.includes(q)
  );
}

function getCopyrightStatus(artist) {
  if (!artist.death) return { status: '존속', label: '생존 중', color: 'green' };
  const deathDate = new Date(artist.death);
  const years = (new Date() - deathDate) / (365.25 * 24 * 60 * 60 * 1000);
  const duration = ARR_SETTINGS ? ARR_SETTINGS.copyrightDuration : 70;
  if (years <= duration) {
    return { status: '존속', label: `사후 ${Math.floor(years)}년 (${duration}년 이내)`, color: 'green' };
  }
  return { status: '만료', label: `사후 ${Math.floor(years)}년 — 만료`, color: 'red' };
}

// 거래 데이터에 추급권 정보 부착
function enrichTransactions() {
  return TRANSACTIONS_DATA.map(t => {
    const artist = getArtistById(t.artistId);
    const eligibility = checkEligibility(t, artist);
    const royalty = eligibility.eligible ? calculateRoyalty(t.salePrice) : { totalRoyalty: 0, effectiveRate: '0', details: [] };
    return { ...t, artist, eligibility, royalty };
  });
}
