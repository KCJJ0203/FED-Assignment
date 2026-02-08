(function () {
  const firebaseConfig = window.AppFirebase && window.AppFirebase.config
    ? window.AppFirebase.config
    : null;

  if (!firebaseConfig) {
    throw new Error("Missing shared Firebase config. Ensure ../js/app-firebase.js is loaded first.");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  const auth = firebase.auth();
  let cachedContext = null;
  let inFlightContextPromise = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderAccessError(message) {
    const safeMessage = escapeHtml(message || "Vendor access is unavailable.");
    document.body.innerHTML = `
      <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f5f7fb;">
        <section role="alert" aria-live="assertive" style="max-width:520px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08);font-family:Arial,sans-serif;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Vendor Access Blocked</h1>
          <p style="margin:0 0 16px;color:#475569;line-height:1.5;">${safeMessage}</p>
          <a href="../login.html" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#1A237E;color:#fff;text-decoration:none;">Back to Login</a>
        </section>
      </main>
    `;
  }

  function getCurrentUser() {
    if (auth.currentUser) {
      return Promise.resolve(auth.currentUser);
    }
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user || null);
      });
    });
  }

  async function resolveVendorContext() {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = "../login.html";
      throw new Error("No authenticated user.");
    }

    const profileDoc = await db.collection("users").doc(user.uid).get();
    if (!profileDoc.exists) {
      renderAccessError("Your user profile could not be found. Please contact support.");
      throw new Error("Missing users/{uid} profile.");
    }

    const profile = profileDoc.data() || {};
    const userType = String(profile.userType || "").toLowerCase();
    if (userType !== "vendor") {
      renderAccessError("This account is not a vendor account.");
      throw new Error("Non-vendor account blocked.");
    }

    const stallId = String(
      profile.stallId || profile.stallID || profile.stall_id || ""
    ).trim();
    if (!stallId) {
      renderAccessError("No stall is linked to this vendor account.");
      throw new Error("Missing stallId mapping in users/{uid}.");
    }

    cachedContext = {
      uid: user.uid,
      userType: "vendor",
      stallId
    };
    return cachedContext;
  }

  function getVendorContext() {
    if (cachedContext) {
      return Promise.resolve(cachedContext);
    }
    if (!inFlightContextPromise) {
      inFlightContextPromise = resolveVendorContext()
        .catch((error) => {
          inFlightContextPromise = null;
          throw error;
        });
    }
    return inFlightContextPromise;
  }

  window.vendorDb = db;
  window.vendorAuth = auth;
  window.getVendorContext = getVendorContext;
  window.showVendorAccessError = renderAccessError;
})();
