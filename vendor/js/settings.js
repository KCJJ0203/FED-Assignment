const db = window.vendorDb || firebase.firestore();
let vendorContext = null;

document.addEventListener("DOMContentLoaded", () => {
  bindSettingsEvents();
  initSettingsPage();
});

async function initSettingsPage() {
  try {
    vendorContext = await window.getVendorContext();
    loadSettings();
  } catch (error) {
    console.error("Vendor settings initialization failed:", error);
    showToast("Unable to load vendor settings.", true);
  }
}

function getStallDocRef() {
  if (!vendorContext?.stallId) {
    throw new Error("Missing vendor stall context.");
  }
  return db.collection("stalls").doc(vendorContext.stallId);
}

function bindSettingsEvents() {
  document.getElementById("save-settings-btn")?.addEventListener("click", saveSettings);
  document.getElementById("test-print-btn")?.addEventListener("click", () => {
    showToast("Test receipt printed.");
  });
  document.getElementById("reset-sequence-btn")?.addEventListener("click", () => {
    showToast("Queue sequence reset to #001.");
  });
  document.getElementById("reset-data-btn")?.addEventListener("click", () => {
    showToast("Disabled in demo mode.", true);
  });
}

function loadSettings() {
  getStallDocRef()
    .get()
    .then((record) => {
      if (!record.exists) {
        showToast("No stall profile found for this account.", true);
        return;
      }
      const data = record.data() || {};
      document.getElementById("inp-stall-name").value = data.stallName || "";
      document.getElementById("inp-banner").value = data.bannerUrl || "";
      document.getElementById("inp-uen").value = data.uen || "";
      document.getElementById("inp-takeaway").value = data.takeawayCharge || "0.30";
      document.getElementById("inp-footer").value = data.receiptFooter || "";

      if (data.stallName) {
        document.getElementById("header-stall-name").innerText = data.stallName;
      }
    })
    .catch((error) => {
      console.error("Failed to load settings:", error);
      showToast("Unable to load settings.", true);
    });
}

function saveSettings() {
  const saveButton = document.getElementById("save-settings-btn");
  if (!saveButton) return;

  const originalMarkup = saveButton.innerHTML;
  saveButton.innerText = "Saving...";
  saveButton.disabled = true;

  const newName = document.getElementById("inp-stall-name").value.trim();
  const newBanner = document.getElementById("inp-banner").value.trim();
  const newUen = document.getElementById("inp-uen").value.trim();
  const newTakeaway = document.getElementById("inp-takeaway").value.trim();
  const newFooter = document.getElementById("inp-footer").value.trim();

  getStallDocRef()
    .update({
      stallName: newName,
      bannerUrl: newBanner,
      uen: newUen,
      takeawayCharge: newTakeaway,
      receiptFooter: newFooter
    })
    .then(() => {
      showToast("Settings saved successfully.");
      document.getElementById("header-stall-name").innerText =
        newName || "Uncle Lim Chicken Rice";
    })
    .catch((error) => {
      console.error("Failed to save settings:", error);
      showToast("Unable to save settings.", true);
    })
    .finally(() => {
      saveButton.innerHTML = originalMarkup;
      saveButton.disabled = false;
    });
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast-container");
  const msgSpan = document.getElementById("toast-message");
  if (!toast || !msgSpan) return;

  msgSpan.innerText = message;
  const icon = toast.querySelector(".toast-icon");

  if (isError) {
    toast.style.borderLeftColor = "#E74C3C";
    if (icon) {
      icon.style.color = "#E74C3C";
      icon.className = "fas fa-exclamation-circle toast-icon";
    }
  } else {
    toast.style.borderLeftColor = "#2ECC71";
    if (icon) {
      icon.style.color = "#2ECC71";
      icon.className = "fas fa-check-circle toast-icon";
    }
  }

  toast.className = "show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}
