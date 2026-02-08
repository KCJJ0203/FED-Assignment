const db = window.vendorDb || firebase.firestore();
let vendorContext = null;

document.addEventListener("DOMContentLoaded", () => {
  bindNotificationUiEvents();
  initNotificationsPage();
});

async function initNotificationsPage() {
  try {
    vendorContext = await window.getVendorContext();
    loadNotifications();
  } catch (error) {
    console.error("Vendor notifications initialization failed:", error);
    const container = document.getElementById("notification-list");
    if (container) {
      container.innerHTML =
        '<p style="color:#b91c1c;">Unable to load notifications because vendor access is unavailable.</p>';
    }
  }
}

function getNotificationCollectionRef() {
  if (!vendorContext?.stallId) {
    throw new Error("Missing vendor stall context.");
  }
  return db
    .collection("stalls")
    .doc(vendorContext.stallId)
    .collection("notifications");
}

function bindNotificationUiEvents() {
  document
    .getElementById("send-test-alert-btn")
    ?.addEventListener("click", createDemoNotification);
  document
    .getElementById("open-clear-modal-btn")
    ?.addEventListener("click", openClearModal);
  document
    .getElementById("close-clear-modal-btn")
    ?.addEventListener("click", closeClearModal);
  document
    .getElementById("confirm-clear-all-btn")
    ?.addEventListener("click", performClearAll);

  document.getElementById("notification-list")?.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-action='delete-notification']");
    if (!deleteButton) return;
    const notificationId = decodeDataId(deleteButton.dataset.notificationId);
    if (!notificationId) return;
    deleteNotification(notificationId);
  });

  window.addEventListener("click", (event) => {
    const clearModal = document.getElementById("clearModal");
    if (event.target === clearModal) {
      closeClearModal();
    }
  });
}

function loadNotifications() {
  const container = document.getElementById("notification-list");
  if (!container) return;
  container.innerHTML = '<p style="color:#999;">Loading...</p>';

  getNotificationCollectionRef()
    .orderBy("timestamp", "desc")
    .onSnapshot(
      (snapshot) => {
        container.innerHTML = "";
        if (snapshot.empty) {
          container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
              <i class="fas fa-bell-slash" style="font-size:40px; margin-bottom:10px;"></i>
              <p>No new notifications</p>
            </div>
          `;
          return;
        }

        snapshot.forEach((record) => {
          renderNotificationCard(container, record.id, record.data() || {});
        });
      },
      (error) => {
        console.error("Failed to subscribe to notifications:", error);
        container.innerHTML =
          '<p style="color:#b91c1c;">Unable to load notifications right now.</p>';
      }
    );
}

function renderNotificationCard(container, id, data) {
  let icon = "fa-info-circle";
  let colorClass = "info";

  if (data.type === "warning") {
    icon = "fa-exclamation-triangle";
    colorClass = "warning";
  } else if (data.type === "success") {
    icon = "fa-check-circle";
    colorClass = "success";
  } else if (data.type === "critical") {
    icon = "fa-times-circle";
    colorClass = "critical";
  }

  let timeString = "Just now";
  if (data.timestamp?.toDate) {
    const date = data.timestamp.toDate();
    timeString = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const safeTitle = escapeHtml(data.title || "Notification");
  const safeMessage = escapeHtml(data.message || "");
  const encodedId = encodeDataId(id);

  container.innerHTML += `
    <div class="notify-card ${colorClass}">
      <div class="notify-icon-box">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notify-content">
        <div class="notify-header">
          <span class="notify-title">${safeTitle}</span>
          <span class="notify-time">${escapeHtml(timeString)}</span>
        </div>
        <div class="notify-message">${safeMessage}</div>
      </div>
      <button class="notify-close" type="button" aria-label="Delete notification" data-action="delete-notification" data-notification-id="${encodedId}">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
}

function deleteNotification(id) {
  getNotificationCollectionRef()
    .doc(id)
    .delete()
    .catch((error) => {
      console.error("Failed to delete notification:", error);
    });
}

function openClearModal() {
  const modal = document.getElementById("clearModal");
  if (modal) modal.style.display = "flex";
}

function closeClearModal() {
  const modal = document.getElementById("clearModal");
  if (modal) modal.style.display = "none";
}

function performClearAll() {
  getNotificationCollectionRef()
    .get()
    .then((snapshot) => {
      const batch = db.batch();
      snapshot.forEach((record) => batch.delete(record.ref));
      return batch.commit();
    })
    .then(() => {
      closeClearModal();
    })
    .catch((error) => {
      console.error("Failed to clear notifications:", error);
      closeClearModal();
    });
}

function createDemoNotification() {
  const demos = [
    {
      title: "Low Stock Alert",
      message: "Chicken thigh inventory is running low (below 5kg).",
      type: "warning"
    },
    {
      title: "New Review",
      message: "A customer left a 5-star review on Google Maps.",
      type: "success"
    },
    {
      title: "System Update",
      message: "POS software was updated successfully to v2.1.",
      type: "info"
    },
    {
      title: "Payment Error",
      message: "Transaction #9921 failed. Please check internet connection.",
      type: "critical"
    }
  ];

  const randomDemo = demos[Math.floor(Math.random() * demos.length)];
  getNotificationCollectionRef().add({
    ...randomDemo,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function encodeDataId(value) {
  return encodeURIComponent(String(value ?? ""));
}

function decodeDataId(value) {
  try {
    return decodeURIComponent(String(value ?? ""));
  } catch (error) {
    return String(value ?? "");
  }
}
