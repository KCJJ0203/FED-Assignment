import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBc5jOMf7hfbWa_65JFcdAMwSKyxtLSCvs",
  authDomain: "fed-assignment-9c219.firebaseapp.com",
  projectId: "fed-assignment-9c219",
  storageBucket: "fed-assignment-9c219.firebasestorage.app",
  messagingSenderId: "287410844855",
  appId: "1:287410844855:web:8c15e5cbe42c321b1e0932"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---------- load profile ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();
  $("#profileName").textContent = data.name || data.username || "User";
  $("#profileEmail").textContent = data.email || user.email || "-";
  $("#profilePhone").textContent = data.phone || data.contact || "-";
});

// ---------- logout ----------
$("#logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  localStorage.removeItem("userType");
  window.location.href = "../login.html";
});

// ---------- top section switch ----------
$$(".acc-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".acc-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const view = btn.dataset.view;
    $$(".acc-view").forEach(v => v.classList.remove("show"));
    $(`#view-${view}`)?.classList.add("show");
  });
});

// ---------- favorites switch ----------
$$(".fav-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".fav-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const t = btn.dataset.fav;
    $$(".fav-panel").forEach(p => p.classList.remove("show"));
    $(`#fav-${t}`)?.classList.add("show");
  });
});

// ---------- preferences save ----------
function getPrefs(){
  try { return JSON.parse(localStorage.getItem("cg_prefs")) || {}; }
  catch { return {}; }
}
function setPrefs(p){ localStorage.setItem("cg_prefs", JSON.stringify(p)); }

function restorePrefs(){
  const prefs = getPrefs();
  $$(".pref-check, .pref-toggle").forEach(el => {
    if (prefs[el.id] !== undefined) el.checked = !!prefs[el.id];
    el.addEventListener("change", () => {
      const next = getPrefs();
      next[el.id] = el.checked;
      setPrefs(next);
    });
  });
}
restorePrefs();

// ---------- feedback stars ----------
const ratingValue = $("#ratingValue");
$$(".star").forEach(star => {
  star.addEventListener("click", () => {
    const val = Number(star.dataset.value);
    if (ratingValue) ratingValue.value = String(val);
    $$(".star").forEach(s => s.classList.toggle("on", Number(s.dataset.value) <= val));
  });
});

$("#feedbackForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const r = Number($("#ratingValue")?.value || 0);
  const title = $("#fbTitle")?.value?.trim() || "";
  const msg = $("#fbMsg")?.value?.trim() || "";

  if (!r) return alert("Please select a rating.");
  if (!title) return alert("Please enter a title.");
  if (!msg) return alert("Please enter your feedback.");

  alert("Feedback submitted (demo).");
  e.target.reset();
  $$(".star").forEach(s => s.classList.remove("on"));
  if (ratingValue) ratingValue.value = "0";
});

// ---------- change password modal (UI only) ----------
const pwModal = $("#pwModal");
$("#openPwModal")?.addEventListener("click", () => pwModal?.classList.add("show"));
$("#closePwModal")?.addEventListener("click", () => pwModal?.classList.remove("show"));
pwModal?.addEventListener("click", (e) => { if (e.target === pwModal) pwModal.classList.remove("show"); });

$("#pwForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const newPw = $("#newPw")?.value || "";
  const confirm = $("#confirmPw")?.value || "";
  if (newPw.length < 6) return alert("Password must be at least 6 characters.");
  if (newPw !== confirm) return alert("Passwords do not match.");
  alert("Password change UI done (backend later).");
  pwModal?.classList.remove("show");
  e.target.reset();
});