import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirebaseApp } from "./firebase-config.js";

const continueAsGuestButton = document.getElementById("continueAsGuest");
continueAsGuestButton.addEventListener("click", async () => {
  localStorage.setItem("userType", "guest");
  try {
    const app = getFirebaseApp();
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

const registerButton = document.getElementById("registerButton");
registerButton.addEventListener("click", () => {
  window.location.href = "signup.html";
});
