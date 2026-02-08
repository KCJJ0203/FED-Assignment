const db = window.vendorDb || firebase.firestore();
let vendorContext = null;

document.addEventListener("DOMContentLoaded", () => {
  bindOverviewEvents();
  initOverviewPage();
});

async function initOverviewPage() {
  try {
    vendorContext = await window.getVendorContext();
    calculateDailyStats();
    loadPopularItems();
    loadStallProfile();
    initTrafficChart();
  } catch (error) {
    console.error("Vendor overview initialization failed:", error);
  }
}

function getStallDocRef() {
  if (!vendorContext?.stallId) {
    throw new Error("Missing vendor stall context.");
  }
  return db.collection("stalls").doc(vendorContext.stallId);
}

function calculateDailyStats() {
  getStallDocRef()
    .collection("active_orders")
    .onSnapshot(
      (snapshot) => {
        let totalRevenue = 0;
        let totalOrders = 0;

        snapshot.forEach((record) => {
          const order = record.data() || {};
          totalOrders += 1;
          if (order.total) {
            totalRevenue += Number.parseFloat(order.total) || 0;
          }
        });

        const revEl = document.getElementById("daily-revenue");
        const ordEl = document.getElementById("daily-orders");
        if (revEl) revEl.innerText = `$${totalRevenue.toFixed(2)}`;
        if (ordEl) ordEl.innerText = String(totalOrders);
      },
      (error) => {
        console.error("Failed to subscribe to active orders:", error);
        showToast("Unable to load sales metrics.", true);
      }
    );
}

function loadPopularItems() {
  const listContainer = document.querySelector(".popular-items-list");
  if (!listContainer) return;

  getStallDocRef()
    .collection("menu_items")
    .limit(3)
    .get()
    .then((snapshot) => {
      let html = "";
      snapshot.forEach((record) => {
        const item = record.data() || {};
        const imageSrc = item.image || "https://placehold.co/50";
        const displayName = escapeHtml(item.name || "Item");
        const displayCategory = escapeHtml(item.category || "General");
        const safePrice = Number(item.price);
        const displayPrice = Number.isFinite(safePrice)
          ? safePrice.toFixed(2)
          : "0.00";

        html += `
          <div class="item-row" style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
            <img src="${escapeAttr(imageSrc)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;margin-right:12px;" alt="${displayName}">
            <div style="flex:1;">
              <div style="font-weight:600;font-size:14px;">${displayName}</div>
              <div style="font-size:11px;color:#888;">${displayCategory}</div>
            </div>
            <div style="font-weight:bold;color:#1A237E;">$${displayPrice}</div>
          </div>
        `;
      });

      listContainer.innerHTML =
        html || '<p style="padding:20px; text-align:center">No items found.</p>';
    })
    .catch((error) => {
      console.error("Failed to load popular items:", error);
      listContainer.innerHTML =
        '<p style="padding:20px; text-align:center; color:#b91c1c;">Unable to load menu data.</p>';
    });
}

function loadStallProfile() {
  getStallDocRef()
    .get()
    .then((record) => {
      if (!record.exists) return;
      const data = record.data() || {};
      const stallName = data.stallName || "My Stall";
      const nameDisplay = document.getElementById("stall-name-display");
      if (nameDisplay) nameDisplay.innerText = stallName;

      const headerTitle = document.querySelector(".header-title strong");
      if (headerTitle) headerTitle.innerText = stallName;
    })
    .catch((error) => {
      console.error("Failed to load stall profile:", error);
    });
}

function initTrafficChart() {
  const canvas = document.getElementById("trafficChart");
  if (!canvas) return;

  const gradient = canvas.getContext("2d").createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, "rgba(67, 97, 238, 0.4)");
  gradient.addColorStop(1, "rgba(67, 97, 238, 0.0)");

  new Chart(canvas, {
    type: "line",
    data: {
      labels: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
      datasets: [
        {
          label: "Orders",
          data: [5, 12, 28, 22, 18, 10, 14],
          borderColor: "#4361ee",
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#4361ee",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { bottom: 10, left: 10, right: 10, top: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: { label: (ctx) => `${ctx.raw} Orders` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: "#f1f5f9", borderDash: [5, 5] },
          ticks: { display: false }
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#94a3b8", font: { size: 11 }, padding: 10 }
        }
      }
    }
  });
}

function bindOverviewEvents() {
  document.getElementById("rental-menu-trigger")?.addEventListener("click", () => {
    toggleRentalMenu();
  });

  document.getElementById("download-copy-btn")?.addEventListener("click", () => {
    showToast("Downloading PDF copy...");
    toggleRentalMenu(false);
  });

  document.getElementById("request-renewal-btn")?.addEventListener("click", () => {
    showToast("Renewal request sent.");
    toggleRentalMenu(false);
  });

  document.getElementById("report-issue-btn")?.addEventListener("click", () => {
    showToast("Issue reported to Admin.", true);
    toggleRentalMenu(false);
  });

  document.getElementById("view-agreement-btn")?.addEventListener("click", () => {
    showAgreementDetails();
  });

  document.getElementById("agreement-close-btn")?.addEventListener("click", () => {
    closeModal();
  });

  document.getElementById("items-close-btn")?.addEventListener("click", () => {
    closeItemsModal();
  });

  document.getElementById("export-report-btn")?.addEventListener("click", () => {
    showToast("Exporting report...");
  });

  document.addEventListener("click", (event) => {
    const dropdown = document.getElementById("rentalDropdown");
    if (
      dropdown &&
      !event.target.closest("#rental-menu-trigger") &&
      !event.target.closest("#rentalDropdown")
    ) {
      dropdown.classList.remove("show");
    }
  });

  window.addEventListener("click", (event) => {
    const agreementModal = document.getElementById("agreementModal");
    const itemsModal = document.getElementById("itemsModal");
    if (event.target === agreementModal) {
      closeModal();
    }
    if (event.target === itemsModal) {
      closeItemsModal();
    }
  });
}

function toggleRentalMenu(forceState) {
  const menu = document.getElementById("rentalDropdown");
  if (!menu) return;
  if (typeof forceState === "boolean") {
    menu.classList.toggle("show", forceState);
    return;
  }
  menu.classList.toggle("show");
}

function showAgreementDetails() {
  const modal = document.getElementById("agreementModal");
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("agreementModal");
  if (modal) modal.style.display = "none";
}

function closeItemsModal() {
  const modal = document.getElementById("itemsModal");
  if (modal) modal.style.display = "none";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
