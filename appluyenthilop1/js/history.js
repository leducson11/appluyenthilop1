/* ============================================================
   history.js – Quản lý lịch sử luyện tập (localStorage)
   ============================================================ */

const HistoryManager = (() => {
  const KEY = 'paypal_history';

  /* ---------- CRUD ---------- */

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch { return []; }
  }

  function save(record) {
    const list = getAll();
    list.unshift(record);          // mới nhất lên đầu
    // Chỉ giữ 100 bản ghi gần nhất
    if (list.length > 100) list.splice(100);
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  /* ---------- Tóm tắt tổng ---------- */

  function getSummary() {
    const list = getAll();
    if (list.length === 0) {
      return { total: 0, avgScore: 0, bestScore: 0, totalQuestions: 0 };
    }
    const total = list.length;
    const totalQuestions = list.reduce((s, r) => s + r.total, 0);
    const scores = list.map(r => (r.correct / r.total) * 100);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);
    return { total, avgScore: Math.round(avgScore), bestScore: Math.round(bestScore), totalQuestions };
  }

  /* ---------- Render trang History ---------- */

  function renderHistoryPage() {
    const list = getAll();
    const emptyEl   = document.getElementById('history-empty');
    const summaryEl = document.getElementById('history-summary');
    const listEl    = document.getElementById('history-list');

    if (list.length === 0) {
      emptyEl.style.display   = 'block';
      summaryEl.innerHTML     = '';
      listEl.innerHTML        = '';
      return;
    }

    emptyEl.style.display = 'none';

    // ---- Summary cards ----
    const s = getSummary();
    summaryEl.innerHTML = `
      <div class="hs-card">
        <span class="hs-num">${s.total}</span>
        <span class="hs-lbl">Bài đã làm</span>
      </div>
      <div class="hs-card">
        <span class="hs-num">${s.totalQuestions}</span>
        <span class="hs-lbl">Tổng câu hỏi</span>
      </div>
      <div class="hs-card">
        <span class="hs-num">${s.avgScore}%</span>
        <span class="hs-lbl">Điểm TB</span>
      </div>
      <div class="hs-card">
        <span class="hs-num">${s.bestScore}%</span>
        <span class="hs-lbl">Điểm cao nhất</span>
      </div>
    `;

    // ---- List items ----
    listEl.innerHTML = list.map((r, idx) => {
      const pct     = Math.round((r.correct / r.total) * 100);
      const rank    = rankEmoji(pct);
      const typeLabel = typeText(r.config.type);
      const levelLabel = levelText(r.config.level);
      const date    = new Date(r.date).toLocaleString('vi-VN');
      return `
        <div class="history-item" data-idx="${idx}">
          <div class="hi-rank">${rank}</div>
          <div class="hi-info">
            <div class="hi-title">${r.total} câu · ${typeLabel} · ${levelLabel}</div>
            <div class="hi-meta">🕐 ${r.timeStr} &nbsp;|&nbsp; 📅 ${date}</div>
          </div>
          <div class="hi-score">${r.correct}/${r.total}</div>
        </div>
      `;
    }).join('');

    // click từng item → mở modal xem lại
    listEl.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        openHistoryModal(list[idx]);
      });
    });
  }

  /* ---------- Modal xem lại chi tiết ---------- */

  function openHistoryModal(record) {
    const overlay = document.getElementById('modal-history-review');
    const content = document.getElementById('modal-review-content');
    content.innerHTML = renderReviewList(record.questions);
    overlay.style.display = 'flex';
  }

  function renderReviewList(questions) {
    return questions.map((q, i) => {
      const status   = q.userAnswer === null ? 'skipped'
                     : q.userAnswer == q.answer ? 'correct' : 'wrong';
      const badge    = status === 'correct' ? '✅' : status === 'wrong' ? '❌' : '⏭';
      const yourAns  = q.userAnswer !== null && q.userAnswer !== undefined
                     ? `<span class="your ${status === 'wrong' ? 'wrong-ans' : ''}">${q.userAnswer}</span>`
                     : `<span class="your">—</span>`;
      const correctAns = status !== 'correct'
                     ? ` → Đáp án: <span class="correct-ans">${q.answer}</span>` : '';
      return `
        <div class="review-item ${status}">
          <div class="review-badge">${badge}</div>
          <div class="review-q">
            <div class="rq-text">Câu ${i+1}: ${q.question}</div>
            <div class="rq-detail">Bạn chọn: ${yourAns}${correctAns}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ---------- helpers ---------- */

  function rankEmoji(pct) {
    if (pct === 100) return '🏆';
    if (pct >= 90)   return '🥇';
    if (pct >= 70)   return '🥈';
    if (pct >= 50)   return '🥉';
    return '📚';
  }

  function typeText(t) {
    const map = { mixed:'Hỗn Hợp', add:'Cộng', sub:'Trừ', compare:'So Sánh' };
    return map[t] || t;
  }

  function levelText(l) {
    const map = { easy:'Dễ', medium:'Trung Bình', hard:'Khó' };
    return map[l] || l;
  }

  return { save, getAll, clear, getSummary, renderHistoryPage, renderReviewList };
})();
