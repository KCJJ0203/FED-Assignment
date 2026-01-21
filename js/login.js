import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBc5jOMf7hfbWa_65JFcdAMwSKyxtLSCvs",
  authDomain: "fed-assignment-9c219.firebaseapp.com",
  projectId: "fed-assignment-9c219",
  storageBucket: "fed-assignment-9c219.firebasestorage.app",
  messagingSenderId: "287410844855",
  appId: "1:287410844855:web:8c15e5cbe42c321b1e0932",
  measurementId: "G-CJBDRY9RQ5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.querySelector(".login-form");
const emailInput = form.querySelector('input[name="email"]');
const passwordInput = form.querySelector('input[name="password"]');

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    const uid = auth.currentUser.uid;
    const snap = await getDoc(doc(db, "users", uid));

    if (!snap.exists()) {
      alert("No userType found for this account.");
      return;
    }

    const userType = snap.data().userType;
    localStorage.setItem("userType", userType);

    if (userType === "customer") {
      window.location.href = "customer-guest/index.html";
    } else if (userType === "vendor") {
      window.location.href = "vendor/index.html";
    } else if (userType === "nea") {
      window.location.href = "nea/index.html";
    } else if (userType === "admin") {
      window.location.href = "admin/index.html";
    } else {
      alert("User type missing or not recognized. Please return to home and try again.");
      window.location.href = "index.html";
    }
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
});
