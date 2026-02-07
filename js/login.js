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
const errorEl = form.querySelector(".form-error");

const errorMessages = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/user-not-found": "No account found for that email.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/too-many-requests": "Too many attempts. Try again later."
};

const setError = (message) => {
  if (!errorEl) {
    return;
  }
  errorEl.textContent = message;
  errorEl.hidden = !message;
};

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => setError(""));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");

  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    const uid = auth.currentUser.uid;
    const snap = await getDoc(doc(db, "users", uid));

    if (!snap.exists()) {
      setError("No account profile found for this account.");
      return;
    }

    const userType = snap.data().userType;
    localStorage.setItem("userType", userType);

    if (userType === "customer") {
      window.location.href = "customer-guest/index.html";
    } else if (userType === "vendor") {
      window.location.href = "Vendor/index.html";
    } else if (userType === "nea") {
      window.location.href = "nea/index.html";
    } else if (userType === "admin") {
      window.location.href = "admin/index.html";
    } else {
      setError("User type missing or not recognized. Please contact support.");
    }
  } catch (err) {
    setError(errorMessages[err.code] || "Login failed. Please try again.");
    console.error(err);
  }
});
