(() => {
  const config = {
    apiKey: "AIzaSyBc5jOMf7hfbWa_65JFcdAMwSKyxtLSCvs",
    authDomain: "fed-assignment-9c219.firebaseapp.com",
    databaseURL:
      "https://fed-assignment-9c219-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fed-assignment-9c219",
    storageBucket: "fed-assignment-9c219.firebasestorage.app",
    messagingSenderId: "287410844855",
    appId: "1:287410844855:web:8c15e5cbe42c321b1e0932",
    measurementId: "G-CJBDRY9RQ5"
  };

  const SDK = {
    appUrl: "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js",
    authUrl: "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js",
    firestoreUrl: "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js",
    databaseUrl: "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js"
  };

  async function getApp() {
    const { getApp: sdkGetApp, getApps, initializeApp } = await import(SDK.appUrl);
    return getApps().length ? sdkGetApp() : initializeApp(config);
  }

  async function getAuth() {
    const app = await getApp();
    const { getAuth: sdkGetAuth, onAuthStateChanged } = await import(SDK.authUrl);
    return {
      auth: sdkGetAuth(app),
      onAuthStateChanged
    };
  }

  async function getAuthUser(timeoutMs = 1200) {
    const { auth, onAuthStateChanged } = await getAuth();
    if (auth.currentUser) {
      return auth.currentUser;
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        unsubscribe();
        resolve(auth.currentUser || null);
      }, timeoutMs);

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(user || null);
      });
    });
  }

  async function getFirestoreDb() {
    const app = await getApp();
    const { getFirestore } = await import(SDK.firestoreUrl);
    return getFirestore(app);
  }

  async function getRealtimeDb() {
    const app = await getApp();
    const { getDatabase } = await import(SDK.databaseUrl);
    return getDatabase(app);
  }

  window.AppFirebase = {
    config,
    getApp,
    getAuth,
    getAuthUser,
    getFirestoreDb,
    getRealtimeDb
  };
})();

