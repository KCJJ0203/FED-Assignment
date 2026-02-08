

import {
  getAuth, onAuthStateChanged, signOut, updateEmail,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc,
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { getFirebaseApp } from "./firebase-config.js";

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let currentUser = null;

$$(".acc-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".acc-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const view = btn.dataset.view;
    $$(".acc-view").forEach(v => v.classList.remove("show"));
    $(`#view-${view}`)?.classList.add("show");
  });
});

$$(".fav-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".fav-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const t = btn.dataset.fav;
    $$(".fav-panel").forEach(p => p.classList.remove("show"));
    $(`#fav-${t}`)?.classList.add("show");
  });
});

function getPrefs() {
  try { return JSON.parse(localStorage.getItem("cg_prefs")) || {}; }
  catch { return {}; }
}
function setPrefs(p) { localStorage.setItem("cg_prefs", JSON.stringify(p)); }

function restorePrefs() {
  const prefs = getPrefs();
  $$(".pref-check, .pref-toggle").forEach(el => {
    if (!el.id) return;
    if (prefs[el.id] !== undefined) el.checked = !!prefs[el.id];
    el.addEventListener("change", () => {
      const next = getPrefs();
      next[el.id] = el.checked;
      setPrefs(next);
    });
  });
}
restorePrefs();

const ratingValue = $("#ratingValue");
$$(".star").forEach(star => {
  star.addEventListener("click", () => {
    const val = Number(star.dataset.value);
    if (ratingValue) ratingValue.value = String(val);
    $$(".star").forEach(s => s.classList.toggle("on", Number(s.dataset.value) <= val));
  });
});

$("#logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  localStorage.removeItem("userType");
  window.location.href = "../login.html";
});

const pwModal = $("#pwModal");
$("#openPwModal")?.addEventListener("click", () => pwModal?.classList.add("show"));
$("#closePwModal")?.addEventListener("click", () => pwModal?.classList.remove("show"));
const pwMsg = $("#pwMsg"); 
function setPwMsg(text = "") {
  if (pwMsg) pwMsg.textContent = text;
}

$("#pwForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  setPwMsg("");

  const currentPw = $("#curPw")?.value || "";
  const newPw = $("#newPw")?.value || "";
  const confirm = $("#confirmPw")?.value || "";

  if (!currentPw) return setPwMsg("Enter current password.");
  if (newPw.length < 6) return setPwMsg("Password must be at least 6 characters.");
  if (newPw !== confirm) return setPwMsg("Passwords do not match.");

  try {
    setPwMsg("Verifying...");

    
    const cred = EmailAuthProvider.credential(currentUser.email, currentPw);
    await reauthenticateWithCredential(currentUser, cred);

    setPwMsg("Updating password...");
    await updatePassword(currentUser, newPw);

    alert("Password changed successfully!");
    pwModal?.classList.remove("show");
    e.target.reset();
  } catch (err) {
    console.error("Password change failed:", err);

    if (err.code === "auth/wrong-password")
      return setPwMsg("Current password is incorrect.");

    if (err.code === "auth/too-many-requests")
      return setPwMsg("Too many attempts. Try again later.");

    if (err.code === "auth/requires-recent-login")
      return setPwMsg("Please log out and log in again first.");

    setPwMsg(err.message || "Failed to change password.");
  }
});

const editModal = $("#editModal");
const editMsg = $("#editMsg");
function setEditMsg(text = "") { if (editMsg) editMsg.textContent = text; }
function openEditModal() { setEditMsg(""); editModal?.classList.add("show"); }

$("#openEditModal")?.addEventListener("click", openEditModal);
$("#openEditModal2")?.addEventListener("click", openEditModal);
$("#closeEditModal")?.addEventListener("click", () => editModal?.classList.remove("show"));
editModal?.addEventListener("click", (e) => { if (e.target === editModal) editModal.classList.remove("show"); });

const cardModal = $("#cardModal");
const cardMsg = $("#cardMsg");
function setCardMsg(text = "") { if (cardMsg) cardMsg.textContent = text; }
function openCardModal() { setCardMsg(""); cardModal?.classList.add("show"); }

$("#openCardModal")?.addEventListener("click", openCardModal);
$("#closeCardModal")?.addEventListener("click", () => cardModal?.classList.remove("show"));
cardModal?.addEventListener("click", (e) => { if (e.target === cardModal) cardModal.classList.remove("show"); });

function onlyDigits(str) { return (str || "").replace(/\D/g, ""); }
function maskLast4(num) {
  const d = onlyDigits(num);
  if (d.length < 4) return "";
  return d.slice(-4);
}
function isValidExp(mmYY) {
  const m = (mmYY || "").trim();
  const match = m.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const mm = Number(match[1]);
  const yy = Number(match[2]);
  if (mm < 1 || mm > 12) return false;
  return yy >= 0 && yy <= 99;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const FAV_KEYS = {
  hawker: "cg_fav_hawker",
  stall: "cg_fav_stall",
  dish: "cg_fav_dish"
};

function readFavs(type) {
  try {
    const raw = localStorage.getItem(FAV_KEYS[type]);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeFavs(type, list) {
  localStorage.setItem(FAV_KEYS[type], JSON.stringify(list));
}

function removeFav(type, id) {
  const list = readFavs(type);
  const next = list.filter(x => String(x.id) !== String(id));
  writeFavs(type, next);
  renderFavPanel(type, next);
}

function renderFavPanel(type, list) {
  const panel = document.getElementById(`fav-${type}`);
  if (!panel) return;

  panel.innerHTML = "";

  if (!list || list.length === 0) {
    panel.innerHTML = `<div class="muted">No favorite ${escapeHtml(type)} yet.</div>`;
    return;
  }

  list.forEach(item => {
    const name = escapeHtml(item.name || "Untitled");
    const sub = escapeHtml(item.sub || "");
    const img = item.imageUrl ? escapeHtml(item.imageUrl) : "../image/lau-pa-sat.jpg";

    const row = document.createElement("div");
    row.className = "fav-item";
    row.innerHTML = `
      <img class="fav-img" src="${img}" alt="${name}">
      <div class="fav-text">
        <div class="fav-name">${name}</div>
        <div class="fav-sub">${sub}</div>
      </div>
      <button class="fav-heart" type="button" aria-label="Remove from favorites">&#10084;</button>
    `;

    row.querySelector(".fav-heart")?.addEventListener("click", () => {
      removeFav(type, item.id);
      window.dispatchEvent(new CustomEvent("cg:favs-updated", { detail: { type } }));
    });

    panel.appendChild(row);
  });
}

function loadFavoritesUI() {
  renderFavPanel("hawker", readFavs("hawker"));
  renderFavPanel("stall", readFavs("stall"));
  renderFavPanel("dish", readFavs("dish"));
}

window.addEventListener("cg:favs-updated", (e) => {
  const t = e?.detail?.type;
  if (t && FAV_KEYS[t]) {
    renderFavPanel(t, readFavs(t));
  } else {
    loadFavoritesUI();
  }
});

function showPfp(urlOrBase64) {
  const img = $("#pfpImg");
  const ph = $("#pfpPlaceholder");
  if (!img || !ph) return;

  if (urlOrBase64) {
    img.src = urlOrBase64;
    img.style.display = "block";
    ph.style.display = "none";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
    ph.style.display = "block";
  }
}
function setPfpMsg(text = "") {
  const el = $("#pfpMsg");
  if (el) el.textContent = text;
}

async function fileToSmallBase64(file, maxSize = 256, quality = 0.75) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

function renderFeedbackList(items) {
  const list = $("#pastFeedbackList");
  const empty = $("#fbEmpty");
  if (!list) return;

  list.innerHTML = "";
  if (!items.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  items.forEach(fb => {
    const div = document.createElement("div");
    div.className = "order-card";
    const stars = "\u2605".repeat(Number(fb.rating || 0));

    div.innerHTML = `
      <div class="order-header">
        <div>
          <p class="order-title">${escapeHtml(fb.title || "Untitled")}</p>
          <p class="order-meta">${escapeHtml(fb.createdAtText || "")}</p>
        </div>
        <div class="order-status">${stars}</div>
      </div>
      <div class="order-items">
        <div class="order-item-row" style="justify-content:flex-start;">
          ${escapeHtml(fb.message || "")}
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderCardsList(cards) {
  const list = $("#cardsList");
  const empty = $("#cardsEmpty");
  if (!list) return;

  list.innerHTML = "";
  if (!cards.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  cards.forEach(c => {
    const div = document.createElement("div");
    div.className = "order-card";
    div.innerHTML = `
      <div class="order-header">
        <div>
          <p class="order-title">${escapeHtml(c.label || "Card")}</p>
          <p class="order-meta">**** ${escapeHtml(c.last4 || "")} \u2022 Exp ${escapeHtml(c.exp || "")}</p>
        </div>
        <button class="order-toggle js-remove-card" data-id="${escapeHtml(c.id)}" type="button">
          Remove
        </button>
      </div>
    `;
    list.appendChild(div);
  });

  $$(".js-remove-card").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!id || !currentUser) return;

      if (!confirm("Remove this card?")) return;

      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "cards", id));
        await loadCards();
      } catch (err) {
        console.error("Remove card failed:", err);
        alert(err?.message || "Failed to remove card.");
      }
    });
  });
}

async function loadFeedback() {
  if (!currentUser) return;

  const colRef = collection(db, "users", currentUser.uid, "feedback");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const items = snap.docs.map(d => {
    const data = d.data();
    let createdAtText = "";
    const ts = data.createdAt;
    if (ts && typeof ts.toDate === "function") createdAtText = ts.toDate().toLocaleString();
    return { title: data.title, rating: data.rating, message: data.message, createdAtText };
  });

  renderFeedbackList(items);
}

async function loadCards() {
  if (!currentUser) return;

  const colRef = collection(db, "users", currentUser.uid, "cards");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCardsList(cards);
}

async function loadMyReviews() {
  const myReviewsList = document.getElementById("myreviews-list");
  const myReviewsEmpty = document.getElementById("myreviews-empty");

  if (!myReviewsList || !myReviewsEmpty) return;
  if (!currentUser) return;

  try {
    const rtdb = getDatabase(app, firebaseConfig.databaseURL);
    const snap = await get(ref(rtdb, `userReviews/${currentUser.uid}`));

    myReviewsList.innerHTML = "";

    if (!snap.exists()) {
      myReviewsEmpty.style.display = "block";
      return;
    }

    myReviewsEmpty.style.display = "none";

    
    const dataObj = snap.val() || {};
    const data = Object.values(dataObj).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    data.forEach(r => {
      const card = document.createElement("div");
      card.className = "myreview-card";

      const stars = "\u2605".repeat(Number(r.rating || 0));

      card.innerHTML = `
        <div class="myreview-title">${escapeHtml(r.title || "Untitled")}</div>
        <div class="myreview-meta">${escapeHtml(r.stallName || "-")} \u2022 ${new Date(r.createdAt || Date.now()).toLocaleString()}</div>
        <div class="myreview-stars">${stars}</div>
        <div>${escapeHtml(r.message || "")}</div>
      `;

      myReviewsList.appendChild(card);
    });
  } catch (err) {
    console.error("loadMyReviews error:", err);
    myReviewsEmpty.style.display = "block";
    myReviewsEmpty.textContent = "Failed to load reviews.";
  }
}

async function loadUserDocAndFillUI(user) {
  
  $("#profileName") && ($("#profileName").textContent = user.displayName || "User");
  $("#profileEmail") && ($("#profileEmail").textContent = user.email || "-");
  $("#profilePhone") && ($("#profilePhone").textContent = "-");

  
  $("#editName") && ($("#editName").value = user.displayName || "");
  $("#editEmail") && ($("#editEmail").value = user.email || "");
  $("#editUsername") && ($("#editUsername").value = "");
  $("#editPhone") && ($("#editPhone").value = "");

  try {
    const refUser = doc(db, "users", user.uid);
    const snap = await getDoc(refUser);

    if (snap.exists()) {
      const data = snap.data();
      $("#profileName") && ($("#profileName").textContent = data.name || data.username || user.displayName || "User");
      $("#profileEmail") && ($("#profileEmail").textContent = data.email || user.email || "-");
      $("#profilePhone") && ($("#profilePhone").textContent = data.phone || data.contact || "-");

      $("#editName") && ($("#editName").value = data.name || user.displayName || "");
      $("#editUsername") && ($("#editUsername").value = data.username || "");
      $("#editEmail") && ($("#editEmail").value = data.email || user.email || "");
      $("#editPhone") && ($("#editPhone").value = data.phone || data.contact || "");

      showPfp(data.pfpBase64 || "");
    } else {
      await setDoc(refUser, { email: user.email || "" }, { merge: true });
      showPfp("");
    }
  } catch (err) {
    console.error("Load profile failed:", err);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  currentUser = user;
  await loadUserDocAndFillUI(user);

  
  loadFavoritesUI();

  try { await loadFeedback(); } catch (e) { console.error("loadFeedback:", e); }
  try { await loadCards(); } catch (e) { console.error("loadCards:", e); }
  try { await loadMyReviews(); } catch (e) { console.error("loadMyReviews:", e); }
});

$("#editForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  setEditMsg("");

  const name = $("#editName")?.value?.trim() || "";
  const username = $("#editUsername")?.value?.trim() || "";
  const phone = $("#editPhone")?.value?.trim() || "";
  const newEmail = $("#editEmail")?.value?.trim() || "";

  if (!name) return setEditMsg("Name cannot be empty.");
  if (!newEmail) return setEditMsg("Email cannot be empty.");
  if (username && username.length < 3) return setEditMsg("Username must be at least 3 characters.");

  try {
    if (newEmail !== currentUser.email) {
      await updateEmail(currentUser, newEmail);
    }

    const refUser = doc(db, "users", currentUser.uid);
    await setDoc(refUser, {
      name, username, phone, email: newEmail,
      updatedAt: serverTimestamp()
    }, { merge: true });

    $("#profileName") && ($("#profileName").textContent = name || username || "User");
    $("#profileEmail") && ($("#profileEmail").textContent = newEmail || "-");
    $("#profilePhone") && ($("#profilePhone").textContent = phone || "-");

    editModal?.classList.remove("show");
  } catch (err) {
    console.error("Save profile failed:", err);
    if (err?.code === "auth/requires-recent-login") {
      return setEditMsg("Security check: log out + log in again, then change email.");
    }
    setEditMsg(err?.message || "Failed to update profile.");
  }
});

$("#cardForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  setCardMsg("");

  const holder = $("#cardName")?.value?.trim() || "";
  const numberRaw = $("#cardNumber")?.value || "";
  const exp = $("#cardExp")?.value?.trim() || "";
  const cvv = $("#cardCvv")?.value || "";

  if (!holder) return setCardMsg("Cardholder name required.");
  const digits = onlyDigits(numberRaw);
  if (digits.length < 12) return setCardMsg("Card number looks invalid.");
  if (!isValidExp(exp)) return setCardMsg("Expiry must be MM/YY.");
  if (onlyDigits(cvv).length < 3) return setCardMsg("CVV looks invalid.");

  const last4 = maskLast4(digits);
  const label = `Card \u2022 ${holder}`;

  try {
    const colRef = collection(db, "users", currentUser.uid, "cards");
    await addDoc(colRef, { holder, last4, exp, label, createdAt: serverTimestamp() });

    e.target.reset();
    cardModal?.classList.remove("show");
    await loadCards();
  } catch (err) {
    console.error("Save card failed:", err);
    setCardMsg(err?.message || "Failed to save card.");
  }
});

$("#feedbackForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const r = Number($("#ratingValue")?.value || 0);
  const title = $("#fbTitle")?.value?.trim() || "";
  const msg = $("#fbMsg")?.value?.trim() || "";

  if (!r) return alert("Please select a rating.");
  if (!title) return alert("Please enter a title.");
  if (!msg) return alert("Please enter your feedback.");

  try {
    const colRef = collection(db, "users", currentUser.uid, "feedback");
    await addDoc(colRef, { rating: r, title, message: msg, createdAt: serverTimestamp() });

    e.target.reset();
    $$(".star").forEach(s => s.classList.remove("on"));
    if (ratingValue) ratingValue.value = "0";

    await loadFeedback();
    alert("Feedback submitted!");
  } catch (err) {
    console.error("Feedback save failed:", err);
    alert(err?.message || "Failed to submit feedback.");
  }
});

$("#uploadPfpBtn")?.addEventListener("click", async () => {
  if (!currentUser) return;

  const file = $("#pfpInput")?.files?.[0];
  if (!file) return setPfpMsg("Please choose an image first.");
  if (!file.type.startsWith("image/")) return setPfpMsg("Only image files allowed.");

  if (file.size > 2 * 1024 * 1024) return setPfpMsg("Max file size is 2MB.");

  try {
    setPfpMsg("Processing...");
    const base64 = await fileToSmallBase64(file, 256, 0.75);

    setPfpMsg("Saving...");
    const refUser = doc(db, "users", currentUser.uid);
    await setDoc(refUser, { pfpBase64: base64 }, { merge: true });

    showPfp(base64);
    setPfpMsg("Uploaded!");
  } catch (err) {
    console.error("PFP upload failed:", err);
    setPfpMsg(err?.message || "Upload failed.");
  }
});
