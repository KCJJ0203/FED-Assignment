import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBc5jOMf7hfbWa_65JFcdAMwSKyxtLSCvs",
  authDomain: "fed-assignment-9c219.firebaseapp.com",
  projectId: "fed-assignment-9c219",
  storageBucket: "fed-assignment-9c219.firebasestorage.app",
  messagingSenderId: "287410844855",
  appId: "1:287410844855:web:8c15e5cbe42c321b1e0932",
  measurementId: "G-CJBDRY9RQ5"
};

const continueAsGuestButton = document.getElementById("continueAsGuest");
continueAsGuestButton.addEventListener("click", async () => {
  localStorage.setItem("userType", "guest");
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    await signOut(auth);
  } catch (error) {
    console.warn("Guest sign-out failed:", error);
  } finally {
    window.location.href = "customer-guest/index.html";
  }
});

const signInButton = document.getElementById("signInButton");
signInButton.addEventListener("click", () => {
  window.location.href = "login.html";
});
