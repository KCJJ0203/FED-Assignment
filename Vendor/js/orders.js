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
    
    db.collection("stalls").doc(MY_STALL_ID).collection("active_orders")
      .orderBy("timestamp", "asc") 
      .onSnapshot((snapshot) => {
          
          document.getElementById('list-new').innerHTML = '';
          document.getElementById('list-cooking').innerHTML = '';
          document.getElementById('list-ready').innerHTML = '';

          let counts = { new: 0, cooking: 0, ready: 0 };
          
          let allOrders = [];
          snapshot.forEach(doc => {
              allOrders.push({ id: doc.id, ...doc.data() });
          });

          const newStatusOrders = allOrders.filter(o => o.status === 'new');
          const latestNewOrderId = newStatusOrders.length > 0 ? newStatusOrders[newStatusOrders.length - 1].id : null;

          allOrders.forEach((order) => {
              const showNewBadge = (order.id === latestNewOrderId);

              createOrderCard(order, order.id, showNewBadge);
              
              if(counts[order.status] !== undefined) counts[order.status]++;
          });

          document.getElementById('count-new').innerText = counts.new;
          document.getElementById('count-cooking').innerText = counts.cooking;
          document.getElementById('count-ready').innerText = counts.ready;
      });
});

function createOrderCard(order, docId, showNewBadge) {
    let containerId = "";
    let actionButtons = "";

    const hasTakeaway = order.items && order.items.some(item => item.name === "Takeaway");
    
    let displayType = order.type; 
    let iconHtml = '<i class="fas fa-utensils"></i>'; 
    let typeClass = "type-walkin";

    if (hasTakeaway) {
        displayType = "TAKEAWAY";
        iconHtml = '<i class="fas fa-shopping-bag"></i>';
        typeClass = "type-delivery"; 
    } else if (order.type === "Walk-In") {
        displayType = "DINE-IN";
        iconHtml = '<i class="fas fa-utensils"></i>';
        typeClass = "type-walkin";
    } else if (order.type === "Delivery") {
        displayType = "DELIVERY";
        iconHtml = '<i class="fas fa-motorcycle"></i>';
        typeClass = "type-delivery";
    }

    let itemsHtml = "";
    if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
            if (item.name !== "Takeaway Box") {
                itemsHtml += `<div>${item.qty}x ${item.name} <span class="note">${item.notes || ''}</span></div>`;
            }
        });
    }

    if (order.status === 'new') {
        containerId = 'list-new';
        actionButtons = `
            <button class="btn-grey" onclick="updateStatus('${docId}', 'cooking')">
                <i class="fas fa-fire"></i> Start Cooking
            </button>
        `;
    } else if (order.status === 'cooking') {
        containerId = 'list-cooking';
        actionButtons = `
            <div class="btn-group" style="display:grid; grid-template-columns:1fr 2fr; gap:10px;">
                <button class="btn-outline">EDIT</button>
                <button class="btn-green" onclick="updateStatus('${docId}', 'ready')">
                    <i class="fas fa-check"></i> Ready
                </button>
            </div>
        `;
    } else if (order.status === 'ready') {
        containerId = 'list-ready';
        actionButtons = `
            <button class="btn-grey" onclick="updateStatus('${docId}', 'completed')">
                <i class="fas fa-archive"></i> Complete
            </button>
        `;
    } else { return; }

    const html = `
    <div class="order-card" id="${docId}">
        
        ${showNewBadge ? '<div class="badge-new">NEW</div>' : ''}
        
        <div class="card-top">
            <div class="id-group">
                <div class="icon-box walkin">
                    ${iconHtml}
                </div>
                <div>
                    <div class="order-id">${order.orderID || '#---'}</div>
                    <div class="order-type ${typeClass}">${displayType}</div>
                </div>
            </div>
            <div class="timer">Just now</div> 
        </div>

        <div class="order-items">
            ${itemsHtml}
        </div>

        <div class="action-area">
            ${actionButtons}
        </div>
    </div>
    `;

    const container = document.getElementById(containerId);
    if (container) container.innerHTML += html;
}

function updateStatus(docId, newStatus) {
    if (newStatus === 'completed') {
        db.collection("stalls").doc(MY_STALL_ID).collection("active_orders").doc(docId).delete();
    } else {
        db.collection("stalls").doc(MY_STALL_ID).collection("active_orders").doc(docId).update({
            status: newStatus
        });
    }
}