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

let cart = [];
let allMenuItems = []; 
let currentCategory = 'All'; 
let CONTAINER_PRICE = 0.30; 
let currentOrderMode = 'Dine-In';

document.addEventListener('DOMContentLoaded', () => {
    listenToSettings();
    fetchMenu();
    setupEventListeners();
    renderCart();
});

function listenToSettings() {
    db.collection("stalls").doc(MY_STALL_ID)
      .onSnapshot((doc) => {
          if (doc.exists) {
              const data = doc.data();
              if (data.takeawayCharge) {
                  CONTAINER_PRICE = parseFloat(data.takeawayCharge);
                  renderCart(); 
              }
          }
      });
}

function fetchMenu() {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '<p>Loading menu...</p>';

    const sortOrder = { "Mains": 1, "Sides": 2, "Drinks": 3, "Add-ons": 4, "Sets": 5 };

    db.collection("stalls").doc(MY_STALL_ID).collection("menu_items")
      .get().then((querySnapshot) => {
        allMenuItems = []; 
        grid.innerHTML = ''; 

        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No menu items found.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name !== "Takeaway" && data.name !== "Takeaway Box") {
                allMenuItems.push(data); 
            }
        });

        allMenuItems.sort((a, b) => {
            const orderA = sortOrder[a.category] || 99;
            const orderB = sortOrder[b.category] || 99;
            return orderA - orderB;
        });

        renderMenu(allMenuItems);

    }).catch((error) => {
        console.error(error);
        grid.innerHTML = '<p style="color:red">Error loading menu.</p>';
    });
}

function renderMenu(itemsToRender) {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';

    if (itemsToRender.length === 0) {
        grid.innerHTML = '<p>No items match your search.</p>';
        return;
    }

    itemsToRender.forEach(item => {
        const imageSrc = item.image || "https://placehold.co/150";
        
        const cardHTML = `
            <div class="menu-card" onclick="addToCart('${item.name}', ${item.price}, '${imageSrc}', '${item.category}')">
                <img src="${imageSrc}" class="menu-img">
                <div class="menu-title">${item.name}</div>
                <div class="menu-price">$${item.price.toFixed(2)}</div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

function setupEventListeners() {
    const tabs = document.querySelectorAll('.cat-pill');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const category = tab.innerText; 
            
            if (category === "All") {
                renderMenu(allMenuItems);
            } else {
                const filtered = allMenuItems.filter(item => item.category === category);
                renderMenu(filtered);
            }
        });
    });

    const searchInput = document.querySelector('.search-bar input');
    searchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allMenuItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
        renderMenu(filtered);
    });
}

function addToCart(name, price, image, category) {
    if (name.toLowerCase().includes("takeaway") && category === "System") return; 

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ name, price, qty: 1, img: image, category, notes: "" });
    }
    renderCart();
}

function updateQty(index, change) {
    if (cart[index].name === "Takeaway Charge") return;

    if (cart[index].qty + change > 0) {
        cart[index].qty += change;
    } else {
        cart.splice(index, 1);
    }
    renderCart();
}

function setOrderMode(mode) {
    currentOrderMode = mode;
    
    document.getElementById('btn-dinein').classList.remove('active', 'takeaway-mode');
    document.getElementById('btn-takeaway').classList.remove('active', 'takeaway-mode');

    if (mode === 'Takeaway') {
        document.getElementById('btn-takeaway').classList.add('active', 'takeaway-mode');
    } else {
        document.getElementById('btn-dinein').classList.add('active');
    }
    renderCart();
}

function toggleTag(index, tag) {
    let currentNotes = cart[index].notes || "";
    
    if (currentNotes.includes(tag)) {
        currentNotes = currentNotes.replace(tag, "").replace(", ,", ",").trim();
        if (currentNotes.startsWith(",")) currentNotes = currentNotes.substring(1).trim();
        if (currentNotes.endsWith(",")) currentNotes = currentNotes.substring(0, currentNotes.length - 1).trim();
    } else {
        if (currentNotes.length > 0) {
            currentNotes += ", " + tag;
        } else {
            currentNotes = tag;
        }
    }
    cart[index].notes = currentNotes;
    renderCart();
}

function updateNote(index, value) {
    cart[index].notes = value;
}

function renderCart() {
    const container = document.getElementById('cart-container');
    container.innerHTML = '';
    
    cart = cart.filter(item => item.name !== "Takeaway Charge");

    if (currentOrderMode === 'Takeaway') {
        let containerCount = 0;
        cart.forEach(item => {
            if (item.category !== 'Drinks' && item.category !== 'Add-ons') {
                containerCount += item.qty;
            }
        });

        if (containerCount > 0) {
            cart.push({
                name: "Takeaway Charge",
                price: CONTAINER_PRICE, 
                qty: containerCount,
                img: "https://placehold.co/50/FF5252/FFFFFF?text=BOX", 
                isSystemItem: true
            });
        }
    }
    
    let subtotal = 0;
    const commonTags = ["No Chili", "More Chili", "Less Rice", "More Sauce", "Breast Meat"];
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        const isSystem = item.isSystemItem;
        const rowStyle = isSystem ? "background:#FFF3E0; border-radius:8px; padding:5px;" : "";
        
        let extrasHtml = '';
        
        if (!isSystem) {
            const currentNotes = item.notes || "";
            let tagsHtml = `<div class="quick-tags">`;
            commonTags.forEach(tag => {
                const isActive = currentNotes.includes(tag) ? "active" : "";
                tagsHtml += `<span class="tag-pill ${isActive}" onclick="toggleTag(${index}, '${tag}')">${tag}</span>`;
            });
            tagsHtml += `</div>`;
            
            extrasHtml = `
                <div class="item-extras">
                    ${tagsHtml}
                    <input type="text" class="note-input" placeholder="Custom note..." value="${currentNotes}" onchange="updateNote(${index}, this.value)">
                </div>
            `;
        }

        const controls = isSystem ? "" : `
            <div class="qty-control">
                <span class="qty-btn" onclick="updateQty(${index}, -1)">-</span>
                <span>${item.qty}</span>
                <span class="qty-btn" onclick="updateQty(${index}, 1)">+</span>
            </div>
        `;

        const html = `
        <div class="cart-item" style="flex-wrap:wrap; ${rowStyle}">
            <div style="display:flex; width:100%; gap:12px; align-items:center;">
                <img src="${item.img}" class="cart-item-img">
                <div class="cart-item-details">
                    <span class="cart-item-title">${item.name}</span>
                    <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
                </div>
                ${controls}
            </div>
            ${extrasHtml}
        </div>
        `;
        container.innerHTML += html;
    });

    document.getElementById('cart-total').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-subtotal').innerText = `$${subtotal.toFixed(2)}`;
}

let selectedPaymentMethod = 'Cash';

function openPaymentModal() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }
    
    let total = 0;
    cart.forEach(item => total += (item.price * item.qty));
    
    document.getElementById('modal-total-amount').innerText = `$${total.toFixed(2)}`;
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function selectMethod(element, method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.pay-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
}

function processPayment() {
    const btn = document.querySelector('.btn-confirm-pay');
    btn.innerText = "Processing...";
    
    const orderIdRaw = Math.floor(Math.random() * 10000);
    const orderID = "ORD-" + orderIdRaw;
    const totalAmount = parseFloat(document.getElementById('modal-total-amount').innerText.replace('$',''));
    
    const newOrder = {
        orderID: orderID,
        items: cart,
        total: totalAmount,
        paymentMethod: selectedPaymentMethod,
        status: "new",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        type: currentOrderMode
    };

    db.collection("stalls").doc(MY_STALL_ID).collection("active_orders").add(newOrder)
    .then(() => {
        closePaymentModal(); 
        document.getElementById('success-order-id').innerText = `Order #${orderIdRaw} Created`;
        document.getElementById('success-total-amount').innerText = `$${totalAmount.toFixed(2)}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderID}`;
        document.getElementById('success-qr-img').src = qrUrl;
        document.getElementById('successModal').style.display = 'flex';
        btn.innerHTML = '<i class="fas fa-check-circle"></i> CONFIRM PAYMENT';
    })
    .catch((error) => {
        console.error(error);
        alert("Payment Failed");
        btn.innerHTML = '<i class="fas fa-check-circle"></i> CONFIRM PAYMENT';
    });
}

function clearCart() {
    cart = [];
    setOrderMode('Dine-In');
    renderCart();
}

function resetPos() {
    document.getElementById('successModal').style.display = 'none';
    clearCart();
}

function expandQR() {
    const smallSrc = document.getElementById('success-qr-img').src;
    document.getElementById('big-qr-img').src = smallSrc;
    document.getElementById('qrLightbox').style.display = 'flex';
}

function closeQR() {
    document.getElementById('qrLightbox').style.display = 'none';
}

function printReceipt() {
    let itemsHtml = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        itemsHtml += `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${item.qty}x ${item.name}</span>
                <span>$${itemTotal.toFixed(2)}</span>
            </div>
            ${item.notes ? `<div style="font-size:10px; color:#666; margin-top:-3px;">(${item.notes})</div>` : ''}
        `;
    });

    const receiptContent = `
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Courier New', monospace; width: 300px; padding: 20px; }
                .center { text-align: center; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .total { font-weight: bold; font-size: 18px; display: flex; justify-content: space-between; }
            </style>
        </head>
        <body>
            <div class="center">
                <h3>UNCLE LIM<br>CHICKEN RICE</h3>
                <p>HawkerHub @ Maxwell<br>Stall #04-21</p>
            </div>
            <div class="divider"></div>
            <div style="font-size: 12px;">
                Date: ${new Date().toLocaleString()}<br>
                Order ID: ${document.getElementById('success-order-id').innerText}
            </div>
            <div class="divider"></div>
            
            ${itemsHtml}
            
            <div class="divider"></div>
            <div class="total">
                <span>TOTAL</span>
                <span>$${total.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div class="center" style="font-size: 12px; margin-top: 20px;">
                Thank you for dining with us!
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '', 'width=350,height=600');
    win.document.write(receiptContent);
    win.document.close();
    win.print(); 
}