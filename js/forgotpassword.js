import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

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

const form = document.querySelector(".login-form");
const emailInput = form.querySelector('input[name="email"]');
const errorEl = form.querySelector(".form-error");

const errorMessages = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-not-found": "No account found with this email.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/missing-email": "Please enter your email address."
};

const setError = (message) => {
  if (!errorEl) {
    return;
  }
  errorEl.textContent = message;
  errorEl.hidden = !message;
};

emailInput.addEventListener("input", () => setError(""));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");

  const email = emailInput.value.trim();

  if (!email) {
    setError("Please enter your email address.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    
    alert("Password reset email sent! Please check your inbox and follow the instructions to reset your password.");
    
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (err) {
    if (err.code === "auth/user-not-found") {

      alert("If an account exists with this email, you will receive a password reset link.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      setError(errorMessages[err.code] || "Failed to send reset email. Please try again.");
    }
    console.error(err);
  }
});