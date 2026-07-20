/* ============================================================
   exam.js – Logic làm bài thi
   ============================================================ */

const ExamManager = (() => {

  /* ---- State ---- */
  let questions   = [];
  let answers     = [];   // null | giá trị user chọn
  let currentIdx  = 0;
  let timerSec    = 0;
  let timerHandle = null;
  let config      = {};
  let submitted   = false;

  /* ============================================================
     KHỞI ĐỘNG ĐỀ
  ============================================================ */
  function start(cfg) {
    config      = cfg;
    questions   = QuestionGenerator.generate(cfg.count, cfg.type, cfg.level);
    answers     = new Array(questions.length).fill(null);
    currentIdx  = 0;
    timerSec    = 0;
    submitted   = false;

    showScreen('screen-exam');
    startTimer();
    renderQuestion(0);
    buildNavDots();
  }

  /* ============================================================
     TIMER
  ============================================================ */
  function startTimer() {
    clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      timerSec++;
      document.getElementById('exam-timer').textContent = '⏱ ' + formatTime(timerSec);
    }, 1000);
  }

  function stopTimer() { clearInterval(timerHandle); }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ============================================================
     RENDER CÂU HỎI
  ============================================================ */
  function renderQuestion(idx) {
    currentIdx = idx;
    const q    = questions[idx];
    const total = questions.length;

    // Header
    document.getElementById('exam-progress-text').textContent = `Câu ${idx+1}/${total}`;
    const pct = ((idx + 1) / total) * 100;
    document.getElementById('exam-progress-fill').style.width = pct + '%';

    // Question
    document.getElementById('q-number').textContent = `Câu ${idx + 1}`;
    document.getElementById('q-text').textContent   = q.question;

    // Feedback reset
    const fbEl = document.getElementById('q-feedback');
    fbEl.textContent  = '';
    fbEl.className    = 'feedback';
    fbEl.style.color  = '';

    // Answers
    const grid = document.getElementById('answer-grid');
    grid.innerHTML = '';
    grid.className = 'answer-grid' + (q.type === 'compare' ? ' compare-grid' : '');

    const savedAnswer = answers[idx];
    const alreadyAnswered = savedAnswer !== null;
    const wasSkipped      = savedAnswer === '__skip__';

    q.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className   = 'answer-btn';
      btn.textContent = choice;
      btn.dataset.val = choice;

      if (alreadyAnswered) {
        btn.disabled = true;
        if (!wasSkipped) {
          // Highlight đúng/sai
          if (choice == q.answer)       btn.classList.add('correct');
          else if (choice == savedAnswer) btn.classList.add('wrong');
        }
      } else {
        btn.addEventListener('click', () => handleAnswer(idx, choice));
      }

      grid.appendChild(btn);
    });

    // Feedback khi quay lại câu đã làm
    if (alreadyAnswered && !wasSkipped) {
      if (savedAnswer == q.answer) {
        fbEl.textContent = '✅ Chính xác!';
        fbEl.className   = 'feedback correct';
      } else {
        fbEl.textContent = `❌ Sai! Đáp án đúng: ${q.answer}`;
        fbEl.className   = 'feedback wrong';
      }
    } else if (wasSkipped) {
      fbEl.textContent = '⏭ Đã bỏ qua câu này';
      fbEl.className   = 'feedback';
      fbEl.style.color = 'var(--skip-clr)';
    }

    // Nav dots
    updateNavDots(idx);

    // Prev/Next
    document.getElementById('btn-prev').disabled = idx === 0;
    document.getElementById('btn-next').textContent =
      idx === total - 1 ? 'Xem Lại 📋' : 'Tiếp ▶';
  }

  /* ============================================================
     XỬ LÝ CHỌN ĐÁP ÁN
  ============================================================ */
  function handleAnswer(idx, chosen) {
    if (answers[idx] !== null) return;  // đã trả lời
    answers[idx] = chosen;

    const q   = questions[idx];
    const ok  = chosen == q.answer;
    const fbEl = document.getElementById('q-feedback');

    // Highlight buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.val == q.answer)  btn.classList.add('correct');
      else if (btn.dataset.val == chosen) btn.classList.add('wrong');
    });

    fbEl.textContent = ok ? '✅ Chính xác!' : `❌ Sai! Đáp án đúng: ${q.answer}`;
    fbEl.className   = 'feedback ' + (ok ? 'correct' : 'wrong');

    updateNavDots(idx);

    // Tự động sang câu tiếp sau 800ms
    if (idx < questions.length - 1) {
      setTimeout(() => goTo(idx + 1), 800);
    }
  }

  /* ============================================================
     ĐIỀU HƯỚNG
  ============================================================ */
  function goTo(idx) {
    if (idx < 0 || idx >= questions.length) return;
    renderQuestion(idx);
  }

  function skipCurrent() {
    if (answers[currentIdx] === null) {
      answers[currentIdx] = '__skip__';
      updateNavDots(currentIdx);
      // Cập nhật lại feedback của câu hiện tại
      const fbEl = document.getElementById('q-feedback');
      fbEl.textContent = '⏭ Đã bỏ qua câu này';
      fbEl.className   = 'feedback';
      fbEl.style.color = 'var(--skip-clr)';
    }
    if (currentIdx < questions.length - 1) goTo(currentIdx + 1);
  }

  /* ============================================================
     NAVIGATION DOTS
  ============================================================ */
  function buildNavDots() {
    const nav = document.getElementById('question-nav');
    nav.innerHTML = '';
    questions.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className   = 'qnav-btn';
      btn.textContent = i + 1;
      btn.dataset.idx = i;
      btn.addEventListener('click', () => goTo(i));
      nav.appendChild(btn);
    });
    updateNavDots(0);
  }

  function updateNavDots(current) {
    document.querySelectorAll('.qnav-btn').forEach(btn => {
      const i  = parseInt(btn.dataset.idx);
      const ans = answers[i];
      btn.className = 'qnav-btn';
      if (i === current) {
        btn.classList.add('current');
      } else if (ans === null) {
        // unanswered
      } else if (ans === '__skip__') {
        btn.classList.add('skipped');
      } else if (ans == questions[i].answer) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
      }
    });
  }

  /* ============================================================
     NỘP BÀI
  ============================================================ */
  function submit() {
    if (submitted) return;
    submitted = true;
    stopTimer();

    // Những câu chưa trả lời → bỏ qua
    answers = answers.map(a => a === null ? '__skip__' : a);

    let correct = 0, wrong = 0, skipped = 0;
    questions.forEach((q, i) => {
      if (answers[i] === '__skip__')     skipped++;
      else if (answers[i] == q.answer)  correct++;
      else                              wrong++;
    });

    const pct = Math.round((correct / questions.length) * 100);

    // Ghi lịch sử
    const record = {
      date:      new Date().toISOString(),
      config:    { ...config },
      total:     questions.length,
      correct, wrong, skipped,
      timeSec:   timerSec,
      timeStr:   formatTime(timerSec),
      questions: questions.map((q, i) => ({
        question:   q.question,
        answer:     q.answer,
        userAnswer: answers[i] === '__skip__' ? null : answers[i],
        type:       q.type,
      })),
    };
    HistoryManager.save(record);

    showResult({ correct, wrong, skipped, pct, total: questions.length });
  }

  /* ============================================================
     KẾT QUẢ
  ============================================================ */
  function showResult({ correct, wrong, skipped, pct, total }) {
    showScreen('screen-result');

    // Emoji + title
    let emoji, title;
    if (pct === 100) { emoji = '🏆'; title = 'Xuất Sắc! Tuyệt Vời!'; }
    else if (pct >= 80) { emoji = '🌟'; title = 'Rất Giỏi!'; }
    else if (pct >= 60) { emoji = '👍'; title = 'Khá Tốt!'; }
    else if (pct >= 40) { emoji = '📚'; title = 'Cố Gắng Hơn Nhé!'; }
    else                { emoji = '💪'; title = 'Tiếp Tục Luyện Tập!'; }

    document.getElementById('result-emoji').textContent   = emoji;
    document.getElementById('result-title').textContent   = title;
    document.getElementById('result-score').textContent   = `${correct}/${total}`;
    document.getElementById('stat-correct').textContent   = correct;
    document.getElementById('stat-wrong').textContent     = wrong;
    document.getElementById('stat-skip').textContent      = skipped;
    document.getElementById('stat-time').textContent      = formatTime(timerSec);

    // Animate percent bar
    setTimeout(() => {
      document.getElementById('result-percent-fill').style.width = pct + '%';
    }, 100);
  }

  /* ============================================================
     XEM LẠI
  ============================================================ */
  function showReviewScreen() {
    showScreen('screen-review');
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = questions.map((q, i) => {
      const ans    = answers[i];
      const status = ans === '__skip__' ? 'skipped'
                   : ans == q.answer   ? 'correct' : 'wrong';
      const badge  = status === 'correct' ? '✅' : status === 'wrong' ? '❌' : '⏭';
      const yourAns = ans === '__skip__' || ans === null
        ? `<span class="your">—</span>`
        : `<span class="your ${status === 'wrong' ? 'wrong-ans' : ''}">${ans}</span>`;
      const correctNote = status !== 'correct'
        ? ` → Đáp án: <span class="correct-ans">${q.answer}</span>` : '';
      return `
        <div class="review-item ${status}">
          <div class="review-badge">${badge}</div>
          <div class="review-q">
            <div class="rq-text">Câu ${i+1}: ${q.question}</div>
            <div class="rq-detail">Bạn chọn: ${yourAns}${correctNote}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     RESET
  ============================================================ */
  function reset() {
    stopTimer();
    questions  = [];
    answers    = [];
    currentIdx = 0;
    timerSec   = 0;
    submitted  = false;
  }

  /* ---------- util ---------- */
  function showScreen(id) {
    document.querySelectorAll('#page-practice .screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  return {
    start,
    goTo,
    skipCurrent,
    submit,
    showReviewScreen,
    reset,
    getQuestions:   () => questions,
    getAnswers:     () => answers,
    getConfig:      () => config,
    getCurrentIdx:  () => currentIdx,
  };
})();
