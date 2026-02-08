const db = window.vendorDb || firebase.firestore();
const validation = window.AppValidation || {};
let vendorContext = null;

const settingsForm = document.getElementById("settings-form");
const formErrorEl = document.getElementById("settings-form-error");

const fields = {
  stallName: document.getElementById("inp-stall-name"),
  bannerUrl: document.getElementById("inp-banner"),
  uen: document.getElementById("inp-uen"),
  takeawayCharge: document.getElementById("inp-takeaway"),
  receiptFooter: document.getElementById("inp-footer")
};

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
  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSettings();
  });

  Object.values(fields).forEach((input) => {
    input?.addEventListener("input", () => {
      clearFieldError(input);
      clearFormError();
    });
  });

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
      if (fields.stallName) fields.stallName.value = data.stallName || "";
      if (fields.bannerUrl) fields.bannerUrl.value = data.bannerUrl || "";
      if (fields.uen) fields.uen.value = data.uen || "";
      if (fields.takeawayCharge) fields.takeawayCharge.value = data.takeawayCharge || "0.30";
      if (fields.receiptFooter) fields.receiptFooter.value = data.receiptFooter || "";

      if (data.stallName) {
        const titleEl = document.getElementById("header-stall-name");
        if (titleEl) {
          titleEl.innerText = data.stallName;
        }
      }
    })
    .catch((error) => {
      console.error("Failed to load settings:", error);
      showToast("Unable to load settings.", true);
    });
}

function setFormError(message) {
  if (!formErrorEl) {
    return;
  }
  formErrorEl.textContent = message || "";
  formErrorEl.hidden = !message;
}

function clearFormError() {
  setFormError("");
}

function getFieldErrorEl(inputEl) {
  if (!inputEl?.id) {
    return null;
  }
  return settingsForm?.querySelector(`[data-error-for="${inputEl.id}"]`) || null;
}

function setFieldError(inputEl, message) {
  const errorEl = getFieldErrorEl(inputEl);
  if (validation.setFieldError) {
    validation.setFieldError(inputEl, errorEl, message);
    return;
  }
  if (inputEl) {
    inputEl.classList.add("is-invalid");
    inputEl.setAttribute("aria-invalid", "true");
  }
  if (errorEl) {
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }
}

function clearFieldError(inputEl) {
  const errorEl = getFieldErrorEl(inputEl);
  if (validation.clearFieldError) {
    validation.clearFieldError(inputEl, errorEl);
    return;
  }
  if (inputEl) {
    inputEl.classList.remove("is-invalid");
    inputEl.removeAttribute("aria-invalid");
  }
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}

function clearAllFieldErrors() {
  Object.values(fields).forEach((input) => clearFieldError(input));
  clearFormError();
}

function isRequired(value) {
  return validation.isRequired ? validation.isRequired(value) : String(value || "").trim().length > 0;
}

function maxLength(value, limit) {
  return validation.maxLength ? validation.maxLength(value, limit) : String(value || "").length <= limit;
}

function isUrl(value) {
  return validation.isUrl ? validation.isUrl(value) : true;
}

function isUen(value) {
  return validation.isUen ? validation.isUen(value) : true;
}

function isCurrency(value) {
  return validation.isCurrency
    ? validation.isCurrency(value)
    : Number.isFinite(Number(value)) && Number(value) >= 0;
}

function validateSettingsForm() {
  clearAllFieldErrors();

  const stallName = fields.stallName?.value.trim() || "";
  const bannerUrl = fields.bannerUrl?.value.trim() || "";
  const uen = fields.uen?.value.trim().toUpperCase() || "";
  const takeawayRaw = fields.takeawayCharge?.value.trim() || "0";
  const receiptFooter = fields.receiptFooter?.value.trim() || "";

  let hasError = false;

  if (!isRequired(stallName)) {
    setFieldError(fields.stallName, "Stall name is required.");
    hasError = true;
  } else if (!maxLength(stallName, 80)) {
    setFieldError(fields.stallName, "Stall name must be 80 characters or less.");
    hasError = true;
  }

  if (uen && !isUen(uen)) {
    setFieldError(fields.uen, "Enter a valid UEN format.");
    hasError = true;
  }

  if (bannerUrl && !isUrl(bannerUrl)) {
    setFieldError(fields.bannerUrl, "Banner must be a valid http/https URL.");
    hasError = true;
  }

  if (!isCurrency(takeawayRaw)) {
    setFieldError(fields.takeawayCharge, "Takeaway charge must be a valid number.");
    hasError = true;
  }

  const takeawayCharge = Number.parseFloat(takeawayRaw);
  if (Number.isFinite(takeawayCharge) && (takeawayCharge < 0 || takeawayCharge > 20)) {
    setFieldError(fields.takeawayCharge, "Takeaway charge must be between $0.00 and $20.00.");
    hasError = true;
  }

  if (!maxLength(receiptFooter, 120)) {
    setFieldError(fields.receiptFooter, "Receipt footer must be 120 characters or less.");
    hasError = true;
  }

  if (hasError) {
    setFormError("Please correct the highlighted fields.");
    return null;
  }

  return {
    stallName,
    bannerUrl,
    uen,
    takeawayCharge: Number.isFinite(takeawayCharge) ? takeawayCharge.toFixed(2) : "0.00",
    receiptFooter
  };
}

async function saveSettings() {
  const saveButton = document.getElementById("save-settings-btn");
  if (!saveButton) return;

  const payload = validateSettingsForm();
  if (!payload) {
    return;
  }

  const originalMarkup = saveButton.innerHTML;
  saveButton.innerText = "Saving...";
  saveButton.disabled = true;

  try {
    await getStallDocRef().update(payload);
    showToast("Settings saved successfully.");

    const titleEl = document.getElementById("header-stall-name");
    if (titleEl) {
      titleEl.innerText = payload.stallName || "Uncle Lim Chicken Rice";
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
    setFormError("Unable to save settings. Please try again.");
    showToast("Unable to save settings.", true);
  } finally {
    saveButton.innerHTML = originalMarkup;
    saveButton.disabled = false;
  }
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