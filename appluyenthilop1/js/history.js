/* ============================================================
   history.js – Quản lý lịch sử luyện tập
   Ưu tiên Firebase (đồng bộ đa thiết bị).
   Fallback về localStorage khi offline/chưa kết nối.
   ============================================================ */

const HistoryManager = (() => {
  const LOCAL_KEY = 'paypal_history';

  /* ============================================================
     CACHE nội bộ – giúp render ngay lập tức không cần await
  ============================================================ */
  let _cache = _loadLocal();

  function _loadLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
    catch { return []; }
  }

  function _saveLocal(list) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 100))); }
    catch {}
  }

  /* ============================================================
     LƯU BÀI THI
  ============================================================ */
  async function save(record) {
    // 1. Cập nhật cache + localStorage ngay (UX nhanh)
    _cache.unshift(record);
    if (_cache.length > 100) _cache.splice(100);
    _saveLocal(_cache);

    // 2. Đẩy lên Firebase nếu đã kết nối
    if (window.FirebaseManager) {
      await FirebaseManager.save(record);
    }
  }

  /* ============================================================
     LẤY TẤT CẢ (async – dùng cho các tác vụ cần dữ liệu mới nhất)
  ============================================================ */
  async function getAllAsync() {
    if (window.FirebaseManager && window._firebaseReady) {
      try {
        const list = await FirebaseManager.getAll();
        _cache = list;
        _saveLocal(list);
        return list;
      } catch { /* fallback */ }
    }
    return _cache;
  }

  /* ============================================================
     LẤY TẤT CẢ (sync – dùng cho render ngay, lấy từ cache)
  ============================================================ */
  function getAll() {
    return _cache;
  }

  /* ============================================================
     XÓA TẤT CẢ
  ============================================================ */
  async function clear() {
    _cache = [];
    localStorage.removeItem(LOCAL_KEY);
    if (window.FirebaseManager && window._firebaseReady) {
      await FirebaseManager.clear();
    }
  }

  /* ============================================================
     TÓM TẮT THỐNG KÊ
  ============================================================ */
  function getSummary(list) {
    list = list || _cache;
    if (!list || list.length === 0) {
      return { total: 0, avgScore: 0, bestScore: 0, totalQuestions: 0 };
    }
    const total          = list.length;
    const totalQuestions = list.reduce((s, r) => s + (r.total || 0), 0);
    const scores         = list.map(r => r.total > 0 ? (r.correct / r.total) * 100 : 0);
    const avgScore       = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore      = Math.max(...scores);
    return {
      total,
      avgScore:       Math.round(avgScore),
      bestScore:      Math.round(bestScore),
      totalQuestions,
    };
  }

  /* ============================================================
     RENDER TRANG HISTORY
  ============================================================ */
  async function renderHistoryPage() {
    const emptyEl   = document.getElementById('history-empty');
    const summaryEl = document.getElementById('history-summary');
    const listEl    = document.getElementById('history-list');

    // Render cache ngay (không delay)
    _renderList(_cache, emptyEl, summaryEl, listEl);

    // Sau đó lấy dữ liệu mới nhất từ Firebase & render lại
    const fresh = await getAllAsync();
    if (fresh !== _cache) {
      _renderList(fresh, emptyEl, summaryEl, listEl);
    }
  }

  function _renderList(list, emptyEl, summaryEl, listEl) {
    if (!list || list.length === 0) {
      emptyEl.style.display = 'block';
      summaryEl.innerHTML   = '';
      listEl.innerHTML      = '';
      return;
    }

    emptyEl.style.display = 'none';

    // Summary cards
    const s = getSummary(list);
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

    // Danh sách bài thi
    listEl.innerHTML = list.map((r, idx) => {
      const pct        = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
      const rank       = rankEmoji(pct);
      const typeLabel  = typeText(r.config?.type);
      const levelLabel = levelText(r.config?.level);
      const dateStr    = r.date ? new Date(r.date).toLocaleString('vi-VN') : '—';
      return `
        <div class="history-item" data-idx="${idx}">
          <div class="hi-rank">${rank}</div>
          <div class="hi-info">
            <div class="hi-title">${r.total} câu · ${typeLabel} · ${levelLabel}</div>
            <div class="hi-meta">🕐 ${r.timeStr || '—'} &nbsp;|&nbsp; 📅 ${dateStr}</div>
          </div>
          <div class="hi-score" style="color:${pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--danger)'}">
            ${r.correct}/${r.total}
          </div>
        </div>
      `;
    }).join('');

    // Click → mở modal
    listEl.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        openHistoryModal(list[idx]);
      });
    });
  }

  /* ============================================================
     MODAL CHI TIẾT BÀI THI
  ============================================================ */
  function openHistoryModal(record) {
    const overlay = document.getElementById('modal-history-review');
    const content = document.getElementById('modal-review-content');
    const pct     = record.total > 0 ? Math.round((record.correct / record.total) * 100) : 0;
    const dateStr = record.date ? new Date(record.date).toLocaleString('vi-VN') : '—';

    // Header thông tin tóm tắt
    const header = `
      <div style="background:var(--bg);border-radius:12px;padding:16px 20px;margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">
        <span style="font-size:36px">${rankEmoji(pct)}</span>
        <div>
          <div style="font-size:20px;font-weight:800">${record.correct}/${record.total} câu đúng (${pct}%)</div>
          <div style="font-size:13px;color:var(--text-light)">
            ⏱ ${record.timeStr || '—'} &nbsp;·&nbsp; 📅 ${dateStr}
            &nbsp;·&nbsp; ${typeText(record.config?.type)} &nbsp;·&nbsp; ${levelText(record.config?.level)}
          </div>
        </div>
      </div>
    `;

    content.innerHTML = header + (record.questions
      ? renderReviewList(record.questions)
      : '<p style="text-align:center;padding:20px;color:var(--text-light)">Không có dữ liệu chi tiết</p>');

    overlay.style.display = 'flex';
  }

  function renderReviewList(questions) {
    return questions.map((q, i) => {
      const status     = q.userAnswer === null || q.userAnswer === undefined ? 'skipped'
                       : String(q.userAnswer) === String(q.answer) ? 'correct' : 'wrong';
      const badge      = status === 'correct' ? '✅' : status === 'wrong' ? '❌' : '⏭';
      const yourAns    = q.userAnswer !== null && q.userAnswer !== undefined
                       ? `<span class="your ${status === 'wrong' ? 'wrong-ans' : ''}">${q.userAnswer}</span>`
                       : `<span class="your">—</span>`;
      const correctAns = status !== 'correct'
                       ? ` → Đáp án: <span class="correct-ans">${q.answer}</span>` : '';
      return `
        <div class="review-item ${status}">
          <div class="review-badge">${badge}</div>
          <div class="review-q">
            <div class="rq-text">Câu ${i + 1}: ${q.question}</div>
            <div class="rq-detail">Bạn chọn: ${yourAns}${correctAns}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     HELPERS
  ============================================================ */
  function rankEmoji(pct) {
    if (pct === 100) return '🏆';
    if (pct >= 90)   return '🥇';
    if (pct >= 70)   return '🥈';
    if (pct >= 50)   return '🥉';
    return '📚';
  }

  function typeText(t) {
    const map = { mixed: 'Hỗn Hợp', add: 'Cộng', sub: 'Trừ', compare: 'So Sánh' };
    return map[t] || (t || '—');
  }

  function levelText(l) {
    const map = { easy: 'Dễ', medium: 'Trung Bình', hard: 'Khó' };
    return map[l] || (l || '—');
  }

  return {
    save,
    getAll,
    getAllAsync,
    clear,
    getSummary,
    renderHistoryPage,
    renderReviewList,
  };
})();
