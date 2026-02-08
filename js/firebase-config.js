import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBc5jOMf7hfbWa_65JFcdAMwSKyxtLSCvs",
  authDomain: "fed-assignment-9c219.firebaseapp.com",
  databaseURL: "https://fed-assignment-9c219-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fed-assignment-9c219",
  storageBucket: "fed-assignment-9c219.firebasestorage.app",
  messagingSenderId: "287410844855",
  appId: "1:287410844855:web:8c15e5cbe42c321b1e0932",
  measurementId: "G-CJBDRY9RQ5"
};

export const getFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
};
