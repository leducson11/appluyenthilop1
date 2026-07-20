/* ============================================================
   questions.js – Sinh câu hỏi toán lớp 1
   ============================================================ */

const QuestionGenerator = (() => {

  /* ---------- helpers ---------- */
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = arr => arr.sort(() => Math.random() - .5);

  /** Trả về max value theo độ khó */
  function maxByLevel(level) {
    if (level === 'easy')   return 10;
    if (level === 'medium') return 20;
    return 100;  // hard
  }

  /* ============================================================
     SINH 1 CÂU HỎI
     type: 'add' | 'sub' | 'mixed' | 'compare'
     level: 'easy' | 'medium' | 'hard'
  ============================================================ */
  function generateOne(type, level) {
    const M = maxByLevel(level);

    // Nếu mixed thì random loại
    let actualType = type;
    if (type === 'mixed') {
      const pool = ['add', 'sub', 'compare'];
      actualType = pool[rand(0, pool.length - 1)];
    }

    switch (actualType) {
      case 'add':     return makeAdd(M);
      case 'sub':     return makeSub(M);
      case 'compare': return makeCompare(M);
      default:        return makeAdd(M);
    }
  }

  /* ----- Phép cộng ----- */
  function makeAdd(M) {
    const a = rand(0, M);
    const b = rand(0, M - a);          // đảm bảo a+b <= M
    const answer = a + b;
    return {
      type: 'add',
      text: `${a} + ${b} = ?`,
      question: `${a} + ${b} = ?`,
      answer,
      choices: makeChoices(answer, M),
    };
  }

  /* ----- Phép trừ ----- */
  function makeSub(M) {
    const a = rand(1, M);
    const b = rand(0, a);              // b <= a để kết quả không âm
    const answer = a - b;
    return {
      type: 'sub',
      text: `${a} - ${b} = ?`,
      question: `${a} - ${b} = ?`,
      answer,
      choices: makeChoices(answer, M),
    };
  }

  /* ----- So sánh ----- */
  function makeCompare(M) {
    const a = rand(0, M);
    const b = rand(0, M);
    let answer, text;
    if (a > b)       { answer = '>'; }
    else if (a < b)  { answer = '<'; }
    else             { answer = '='; }
    text = `${a}  ?  ${b}`;
    return {
      type: 'compare',
      text,
      question: `${a}  □  ${b}`,
      answer,
      choices: ['<', '=', '>'],   // luôn cố định 3 đáp án
    };
  }

  /* ----- Tạo 4 lựa chọn cho câu tính toán ----- */
  function makeChoices(correct, M) {
    const set = new Set([correct]);

    // Thêm các giá trị gần đúng
    const candidates = [];
    for (let d = -3; d <= 3; d++) {
      if (d !== 0) {
        const v = correct + d;
        if (v >= 0 && v <= M + 10) candidates.push(v);
      }
    }
    shuffle(candidates);

    for (const c of candidates) {
      if (set.size >= 4) break;
      set.add(c);
    }

    // Fallback nếu vẫn chưa đủ 4
    while (set.size < 4) {
      const v = rand(0, M + 5);
      set.add(v);
    }

    const arr = Array.from(set).slice(0, 4);
    shuffle(arr);
    return arr;
  }

  /* ============================================================
     TẠO DANH SÁCH CÂU HỎI
  ============================================================ */
  function generate(count, type, level) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({ id: i + 1, ...generateOne(type, level) });
    }
    return list;
  }

  return { generate };
})();
