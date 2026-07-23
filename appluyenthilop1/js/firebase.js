/* ============================================================
   firebase.js – Kết nối Firebase & đồng bộ history
   Project: toanlop1-71d9c
   ============================================================ */

// ── Import phải đứng đầu file (ES Module rule) ──────────────
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs,
         deleteDoc, doc, query, orderBy, limit, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Config ───────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAlIYfZP9YRuK8dTQZOxjRbwPZHgKo7M6Y",
  authDomain:        "toanlop1-71d9c.firebaseapp.com",
  databaseURL:       "https://toanlop1-71d9c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "toanlop1-71d9c",
  storageBucket:     "toanlop1-71d9c.firebasestorage.app",
  messagingSenderId: "10438528432",
  appId:             "1:10438528432:web:4f24edcc87b15e8a8e5a75",
  measurementId:     "G-9GS7ZBGX7M"
};

// ── Khởi tạo app ─────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUID = null;

// ── FirebaseManager (expose ra window để các file .js khác dùng) ──
window.FirebaseManager = (() => {

  let _ready    = false;
  let _readyCbs = [];

  /* Đăng ký callback khi Firebase đã sẵn sàng */
  function onReady(cb) {
    if (_ready) cb(currentUID);
    else _readyCbs.push(cb);
  }

  /* Khởi động – đăng nhập ẩn danh */
  function init() {
    _updateStatus('connecting');

    onAuthStateChanged(auth, async user => {
      if (user) {
        currentUID            = user.uid;
        _ready                = true;
        window._firebaseReady = true;
        _readyCbs.forEach(cb => cb(currentUID));
        _readyCbs = [];
        _updateStatus('online');
        console.log('[Firebase] Đã kết nối. UID:', currentUID);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('[Firebase] Đăng nhập ẩn danh thất bại:', err);
          _updateStatus('offline');
        }
      }
    });
  }

  /* Collection của user hiện tại */
  function _userCol() {
    return collection(db, 'users', currentUID, 'history');
  }

  /* Lưu 1 bản ghi lịch sử */
  async function save(record) {
    if (!currentUID) return null;
    try {
      const docRef = await addDoc(_userCol(), {
        ...record,
        createdAt: new Date().toISOString()
      });
      console.log('[Firebase] Đã lưu:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('[Firebase] Lưu thất bại:', err);
      return null;
    }
  }

  /* Lấy toàn bộ lịch sử, mới nhất trước */
  async function getAll() {
    if (!currentUID) return [];
    try {
      const q    = query(_userCol(), orderBy('date', 'desc'), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[Firebase] Lấy dữ liệu thất bại:', err);
      return [];
    }
  }

  /* Xóa toàn bộ lịch sử */
  async function clear() {
    if (!currentUID) return;
    try {
      const snap = await getDocs(_userCol());
      await Promise.all(
        snap.docs.map(d => deleteDoc(doc(db, 'users', currentUID, 'history', d.id)))
      );
      console.log('[Firebase] Đã xóa toàn bộ lịch sử');
    } catch (err) {
      console.error('[Firebase] Xóa thất bại:', err);
    }
  }

  /* Lắng nghe realtime – tự cập nhật khi có thiết bị khác lưu */
  function listenHistory(callback) {
    if (!currentUID) return () => {};
    const q = query(_userCol(), orderBy('date', 'desc'), limit(100));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      callback(list);
    });
  }

  /* Cập nhật badge trạng thái trên header */
  function _updateStatus(state) {
    const badge = document.getElementById('firebase-status');
    if (!badge) return;
    const map = {
      connecting: { text: '⏳ Đang kết nối…', cls: 'status-connecting' },
      online:     { text: '🟢 Đã đồng bộ',    cls: 'status-online'     },
      offline:    { text: '🔴 Offline',         cls: 'status-offline'    },
    };
    const s = map[state] || map.offline;
    badge.textContent = s.text;
    badge.className   = 'firebase-badge ' + s.cls;
  }

  // Expose _updateStatus ra ngoài để dùng khi cần
  function updateStatus(state) { _updateStatus(state); }

  return { init, save, getAll, clear, listenHistory, onReady, updateStatus };
})();

// Tự khởi động ngay khi file được load
FirebaseManager.init();
