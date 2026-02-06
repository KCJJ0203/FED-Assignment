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
    calculateDailyStats();
    loadPopularItems();
    loadStallProfile();
    
    initTrafficChart();
});

function calculateDailyStats() {
    db.collection("stalls").doc(MY_STALL_ID).collection("active_orders")
      .onSnapshot((snapshot) => {
          let totalRevenue = 0;
          let totalOrders = 0;

          snapshot.forEach((doc) => {
              const order = doc.data();
              totalOrders++; 
              if (order.total) {
                  totalRevenue += parseFloat(order.total);
              }
          });

          const revEl = document.getElementById('daily-revenue');
          const ordEl = document.getElementById('daily-orders');
          
          if (revEl) revEl.innerText = `$${totalRevenue.toFixed(2)}`;
          if (ordEl) ordEl.innerText = totalOrders;
      });
}

function loadPopularItems() {
    const listContainer = document.querySelector('.popular-items-list');
    if (!listContainer) return;

    db.collection("stalls").doc(MY_STALL_ID).collection("menu_items").limit(3)
      .get().then((snapshot) => {
          let html = '';
          snapshot.forEach((doc) => {
              const item = doc.data();
              const img = item.image || 'https://placehold.co/50';
              html += `
                <div class="item-row" style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee;">
                    <img src="${img}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; margin-right:12px;">
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:14px;">${item.name}</div>
                        <div style="font-size:11px; color:#888;">${item.category}</div>
                    </div>
                    <div style="font-weight:bold; color:#1A237E;">$${item.price.toFixed(2)}</div>
                </div>
              `;
          });
          listContainer.innerHTML = html || '<p style="padding:20px; text-align:center">No items found.</p>';
      });
}

function loadStallProfile() {
    db.collection("stalls").doc(MY_STALL_ID).get().then(doc => {
        if(doc.exists) {
            const data = doc.data();
            const nameDisplay = document.getElementById('stall-name-display');
            if (nameDisplay) nameDisplay.innerText = data.stallName || "My Stall";
        }
    });
}

function initTrafficChart() {
    const ctx = document.getElementById('trafficChart');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(67, 97, 238, 0.4)'); 
    gradient.addColorStop(1, 'rgba(67, 97, 238, 0.0)'); 

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
            datasets: [{
                label: 'Orders',
                data: [5, 12, 28, 22, 18, 10, 14],
                borderColor: '#4361ee',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#4361ee',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { bottom: 10, left: 10, right: 10, top: 10 }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: { label: (c) => c.raw + ' Orders' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: '#f1f5f9', borderDash: [5, 5] },
                    ticks: { display: false }
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { 
                        color: '#94a3b8', 
                        font: { size: 11 },
                        padding: 10 
                    }
                }
            }
        }
    });
}

function toggleRentalMenu() {
    const menu = document.getElementById('rentalDropdown');
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

function showAgreementDetails() {
    const modal = document.getElementById('agreementModal');
    modal.style.display = 'flex'; 
}

function closeModal() {
    const modal = document.getElementById('agreementModal');
    modal.style.display = 'none';
}

function showAllItems() {
    document.getElementById('itemsModal').style.display = 'flex';
}

function closeItemsModal() {
    document.getElementById('itemsModal').style.display = 'none';
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast-container");
    const msgSpan = document.getElementById("toast-message");
    
    msgSpan.innerText = message;
    
    if (isError) {
        toast.style.borderLeftColor = "#E74C3C"; 
        toast.querySelector('.toast-icon').style.color = "#E74C3C";
        toast.querySelector('.toast-icon').className = "fas fa-exclamation-circle toast-icon";
    } else {
        toast.style.borderLeftColor = "#2ECC71"; 
        toast.querySelector('.toast-icon').style.color = "#2ECC71";
        toast.querySelector('.toast-icon').className = "fas fa-check-circle toast-icon";
    }
    
    toast.className = "show";
    
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}

window.onclick = function(event) {
    const agreementModal = document.getElementById('agreementModal');
    const itemsModal = document.getElementById('itemsModal');
    
    if (event.target === agreementModal) {
        agreementModal.style.display = 'none';
    }
    
    if (event.target === itemsModal) {
        itemsModal.style.display = 'none';
    }
    
    if (!event.target.matches('.fa-ellipsis-h')) {
        const dropdowns = document.getElementsByClassName("menu-dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].style.display === "block") {
                dropdowns[i].style.display = "none";
            }
        }
    }
}