import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

export const firebaseConfig = (() => {
  if (window.AppFirebase && window.AppFirebase.config) {
    return window.AppFirebase.config;
  }
  throw new Error("Missing AppFirebase config. Load js/app-firebase.js before module scripts.");
})();

export const getFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
};
