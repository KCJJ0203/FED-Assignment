import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getFirebaseApp } from "./firebase-config.js";

const app = getFirebaseApp();
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
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.warn("Sign-out after missing profile failed:", signOutError);
      }
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
      window.location.href = "NEA/index.html";
    } else if (userType === "admin") {
      window.location.href = "Admin/Home.html";
    } else {
      setError("User type missing or not recognized. Please contact support.");
    }
  } catch (err) {
    setError(errorMessages[err.code] || "Login failed. Please try again.");
    console.error(err);
  }
});
