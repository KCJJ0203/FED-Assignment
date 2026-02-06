const firebaseConfig = {
  apiKey: "AIzaSyBc5jOMf7hfbWa_65JFcdAMwSKyxtLSCvs",
  authDomain: "fed-assignment-9c219.firebaseapp.com",
  databaseURL: "https://fed-assignment-9c219-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fed-assignment-9c219",
  storageBucket: "fed-assignment-9c219.firebasestorage.app",
  messagingSenderId: "287410844855",
  appId: "1:287410844855:web:8c15e5cbe42c321b1e0932",
  measurementId: "G-CJBDRY9RQ5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const MY_STALL_ID = "0tPLvlPufTsDZ3jH6m5E"; 

document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
});

function loadNotifications() {
    db.collection("stalls").doc(MY_STALL_ID).collection("notifications")
      .orderBy("timestamp", "desc")
      .onSnapshot((snapshot) => {
          const container = document.getElementById('notification-list');
          container.innerHTML = '';

          if (snapshot.empty) {
              container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-bell-slash" style="font-size:40px; margin-bottom:10px;"></i>
                    <p>No new notifications</p>
                </div>`;
              return;
          }

          snapshot.forEach(doc => {
              const notif = doc.data();
              renderNotificationCard(container, doc.id, notif);
          });
      });
}

function renderNotificationCard(container, id, data) {
    let icon = "fa-info-circle";
    let colorClass = "info";

    if (data.type === 'warning') {
        icon = "fa-exclamation-triangle";
        colorClass = "warning";
    } else if (data.type === 'success') {
        icon = "fa-check-circle";
        colorClass = "success";
    } else if (data.type === 'critical') {
        icon = "fa-times-circle";
        colorClass = "critical";
    }

    let timeString = "Just now";
    if (data.timestamp) {
        const date = data.timestamp.toDate();
        timeString = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const html = `
        <div class="notify-card ${colorClass}">
            <div class="notify-icon-box">
                <i class="fas ${icon}"></i>
            </div>
            <div class="notify-content">
                <div class="notify-header">
                    <span class="notify-title">${data.title}</span>
                    <span class="notify-time">${timeString}</span>
                </div>
                <div class="notify-message">${data.message}</div>
            </div>
            <button class="notify-close" onclick="deleteNotification('${id}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.innerHTML += html;
}

function deleteNotification(id) {
    db.collection("stalls").doc(MY_STALL_ID).collection("notifications").doc(id).delete();
}

function openClearModal() {
    document.getElementById('clearModal').style.display = 'flex';
}

function closeClearModal() {
    document.getElementById('clearModal').style.display = 'none';
}

function performClearAll() {
    db.collection("stalls").doc(MY_STALL_ID).collection("notifications").get()
      .then(snapshot => {
          snapshot.forEach(doc => {
              doc.ref.delete();
          });
          closeClearModal();
      });
}

function createDemoNotification() {
    const demos = [
        { title: "Low Stock Alert", message: "Chicken thigh inventory is running low (below 5kg).", type: "warning" },
        { title: "New Review", message: "A customer left a 5-star review on Google Maps!", type: "success" },
        { title: "System Update", message: "POS Software was updated successfully to v2.1.", type: "info" },
        { title: "Payment Error", message: "Transaction #9921 failed. Please check internet connection.", type: "critical" }
    ];

    const random = demos[Math.floor(Math.random() * demos.length)];

    db.collection("stalls").doc(MY_STALL_ID).collection("notifications").add({
        ...random,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

window.onclick = function(event) {
    const clearModal = document.getElementById('clearModal');
    if (event.target === clearModal) {
        clearModal.style.display = 'none';
    }
}