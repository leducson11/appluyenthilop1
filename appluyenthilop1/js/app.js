/* ============================================================
   app.js – Router & UI binding
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     PAGE ROUTER
  ============================================================ */
  const pages = {
    home:     document.getElementById('page-home'),
    practice: document.getElementById('page-practice'),
    history:  document.getElementById('page-history'),
  };

  function navigate(page) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    pages[page].classList.add('active');
    document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');

    if (page === 'history') HistoryManager.renderHistoryPage();
    if (page === 'home')    renderHomeStats();
  }

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  /* ============================================================
     HOME
  ============================================================ */
  function renderHomeStats() {
    const s   = HistoryManager.getSummary();
    const el  = document.getElementById('home-stats');
    if (s.total === 0) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="hero-stat">
        <span class="hs-num">${s.total}</span>
        <span class="hs-lbl">Bài đã làm</span>
      </div>
      <div class="hero-stat">
        <span class="hs-num">${s.avgScore}%</span>
        <span class="hs-lbl">Điểm TB</span>
      </div>
      <div class="hero-stat">
        <span class="hs-num">${s.bestScore}%</span>
        <span class="hs-lbl">Kỷ lục</span>
      </div>
    `;
  }
  renderHomeStats();

  document.getElementById('btn-start-quick').addEventListener('click', () => {
    navigate('practice');
    showPracticeScreen('screen-config');
  });

  /* ============================================================
     PRACTICE – CONFIG SCREEN
  ============================================================ */

  // Option buttons (single-select per group)
  document.querySelectorAll('.option-group').forEach(group => {
    group.querySelectorAll('.opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  function getConfig() {
    const count = parseInt(
      document.querySelector('#opt-count .opt-btn.active').dataset.value
    );
    const type  = document.querySelector('#opt-type .opt-btn.active').dataset.value;
    const level = document.querySelector('#opt-level .opt-btn.active').dataset.value;
    return { count, type, level };
  }

  document.getElementById('btn-start-exam').addEventListener('click', () => {
    const cfg = getConfig();
    ExamManager.reset();
    ExamManager.start(cfg);
  });

  /* ============================================================
     PRACTICE – EXAM SCREEN
  ============================================================ */
  document.getElementById('btn-prev').addEventListener('click', () => {
    const idx = ExamManager.getCurrentIdx();
    if (idx > 0) ExamManager.goTo(idx - 1);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    const idx   = ExamManager.getCurrentIdx();
    const total = ExamManager.getQuestions().length;
    if (idx < total - 1) {
      ExamManager.goTo(idx + 1);
    } else {
      // Cuối đề → xem lại
      ExamManager.showReviewScreen();
    }
  });

  document.getElementById('btn-skip').addEventListener('click', () => {
    ExamManager.skipCurrent();
  });

  document.getElementById('btn-submit').addEventListener('click', () => {
    const answers    = ExamManager.getAnswers();
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
      const ok = confirm(`Còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`);
      if (!ok) return;
    }
    ExamManager.submit();
  });

  /* ============================================================
     PRACTICE – RESULT SCREEN
  ============================================================ */
  document.getElementById('btn-review').addEventListener('click', () => {
    ExamManager.showReviewScreen();
  });

  document.getElementById('btn-redo').addEventListener('click', () => {
    ExamManager.reset();
    showPracticeScreen('screen-config');
  });

  document.getElementById('btn-home-from-result').addEventListener('click', () => {
    ExamManager.reset();
    navigate('home');
  });

  /* ============================================================
     PRACTICE – REVIEW SCREEN
  ============================================================ */
  document.getElementById('btn-back-result').addEventListener('click', () => {
    showPracticeScreen('screen-result');
  });

  /* ============================================================
     HISTORY
  ============================================================ */
  document.getElementById('btn-clear-history').addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử không?')) {
      HistoryManager.clear();
      HistoryManager.renderHistoryPage();
      renderHomeStats();
    }
  });

  document.getElementById('btn-goto-practice').addEventListener('click', () => {
    navigate('practice');
  });

  /* ============================================================
     MODAL HISTORY REVIEW
  ============================================================ */
  document.getElementById('btn-modal-close').addEventListener('click', () => {
    document.getElementById('modal-history-review').style.display = 'none';
  });
  document.getElementById('modal-history-review').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
  });

  /* ============================================================
     HELPER – đổi screen trong practice
  ============================================================ */
  function showPracticeScreen(id) {
    document.querySelectorAll('#page-practice .screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

})();
