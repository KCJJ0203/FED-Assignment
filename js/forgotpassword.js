import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirebaseApp } from "./firebase-config.js";

const app = getFirebaseApp();
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
