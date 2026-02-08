(() => {
  function isRequired(value) {
    return String(value || "").trim().length > 0;
  }

  function isEmail(value) {
    const v = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function isUrl(value) {
    const v = String(value || "").trim();
    if (!v) return true;
    try {
      const url = new URL(v);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function isUen(value) {
    const v = String(value || "").trim().toUpperCase();
    if (!v) return true;
    return /^[0-9][0-9A-Z]{7,9}$/.test(v);
  }

  function isCurrency(value) {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0;
  }

  function maxLength(value, limit) {
    return String(value || "").length <= Number(limit);
  }

  function setFieldError(inputEl, errorEl, message) {
    if (inputEl) {
      inputEl.classList.add("is-invalid");
      inputEl.setAttribute("aria-invalid", "true");
    }
    if (errorEl) {
      errorEl.textContent = String(message || "");
      errorEl.hidden = !message;
    }
  }

  function clearFieldError(inputEl, errorEl) {
    if (inputEl) {
      inputEl.classList.remove("is-invalid");
      inputEl.removeAttribute("aria-invalid");
    }
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
  }

  window.AppValidation = {
    isRequired,
    isEmail,
    isUrl,
    isUen,
    isCurrency,
    maxLength,
    setFieldError,
    clearFieldError
  };
})();

