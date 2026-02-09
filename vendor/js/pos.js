const db = window.vendorDb || firebase.firestore();
let vendorContext = null;
let stallId = "";

let cart = [];
let allMenuItems = []; 
let currentCategory = 'All'; 
let CONTAINER_PRICE = 0.30; 
let currentOrderMode = 'Dine-In';

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

function encodeDataAttr(value) {
    return encodeURIComponent(String(value ?? ""));
}

function decodeDataAttr(value) {
    try {
        return decodeURIComponent(String(value ?? ""));
    } catch (error) {
        return String(value ?? "");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        vendorContext = await window.getVendorContext();
        stallId = vendorContext.stallId;
        listenToSettings();
        fetchMenu();
        setupEventListeners();
        renderCart();
    } catch (error) {
        console.error("Vendor POS initialization failed:", error);
        const menuGrid = document.getElementById("menu-grid");
        if (menuGrid) {
            menuGrid.innerHTML = '<p style="color:red">Unable to load POS for this account.</p>';
        }
    }
});

function listenToSettings() {
    if (!stallId) return;
    db.collection("stalls").doc(stallId)
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

    if (!stallId) {
        grid.innerHTML = '<p style="color:red">Missing stall mapping for this vendor account.</p>';
        return;
    }

    db.collection("stalls").doc(stallId).collection("menu_items")
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
        const imageSrc = item.image || "../image/placeholder.svg";
        const displayName = escapeHtml(item.name);
        const displayPrice = Number(item.price || 0).toFixed(2);
        
        const cardHTML = `
            <button
                type="button"
                class="menu-card menu-card-btn"
                data-action="add-menu-item"
                data-name="${encodeDataAttr(item.name)}"
                data-price="${Number(item.price || 0)}"
                data-image="${encodeDataAttr(imageSrc)}"
                data-category="${encodeDataAttr(item.category || "")}"
                aria-label="Add ${displayName} to cart"
            >
                <img src="${escapeAttr(imageSrc)}" class="menu-img" alt="${displayName}">
                <div class="menu-title">${displayName}</div>
                <div class="menu-price">$${displayPrice}</div>
            </button>
        `;
        grid.innerHTML += cardHTML;
    });
}

function setupEventListeners() {
    const menuGrid = document.getElementById('menu-grid');
    if (menuGrid) {
        menuGrid.addEventListener('click', (event) => {
            const card = event.target.closest('[data-action="add-menu-item"]');
            if (!card) return;
            addToCart(
                decodeDataAttr(card.dataset.name),
                Number(card.dataset.price || 0),
                decodeDataAttr(card.dataset.image),
                decodeDataAttr(card.dataset.category)
            );
        });
    }

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

    const cartContainer = document.getElementById('cart-container');
    if (cartContainer) {
        cartContainer.addEventListener('click', (event) => {
            const qtyButton = event.target.closest('[data-action="update-qty"]');
            if (qtyButton) {
                const index = Number(qtyButton.dataset.index);
                const delta = Number(qtyButton.dataset.delta);
                updateQty(index, delta);
                return;
            }

            const tagButton = event.target.closest('[data-action="toggle-tag"]');
            if (tagButton) {
                const index = Number(tagButton.dataset.index);
                const tag = decodeDataAttr(tagButton.dataset.tag);
                toggleTag(index, tag);
            }
        });

        cartContainer.addEventListener('change', (event) => {
            const noteInput = event.target.closest('[data-action="update-note"]');
            if (!noteInput) return;
            const index = Number(noteInput.dataset.index);
            updateNote(index, noteInput.value);
        });
    }

    const searchInput = document.querySelector('.search-bar input');
    searchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allMenuItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
        renderMenu(filtered);
    });

    document.getElementById('clear-cart-btn')?.addEventListener('click', clearCart);
    document.getElementById('open-payment-btn')?.addEventListener('click', openPaymentModal);
    document.getElementById('close-payment-btn')?.addEventListener('click', closePaymentModal);
    document.getElementById('confirm-payment-btn')?.addEventListener('click', processPayment);
    document.getElementById('print-receipt-btn')?.addEventListener('click', printReceipt);
    document.getElementById('expand-qr-btn')?.addEventListener('click', expandQR);
    document.getElementById('done-next-order-btn')?.addEventListener('click', resetPos);

    document.querySelectorAll('[data-order-mode]').forEach((button) => {
        button.addEventListener('click', () => {
            setOrderMode(button.dataset.orderMode);
        });
    });

    document.getElementById('payment-methods')?.addEventListener('click', (event) => {
        const option = event.target.closest('[data-payment-method]');
        if (!option) return;
        selectMethod(option, option.dataset.paymentMethod);
    });

    const qrLightbox = document.getElementById('qrLightbox');
    qrLightbox?.addEventListener('click', (event) => {
        if (event.target === qrLightbox) {
            closeQR();
        }
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
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
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
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
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
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
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
                img: "../image/placeholder.svg", 
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
                tagsHtml += `
                    <button
                        type="button"
                        class="tag-pill ${isActive}"
                        data-action="toggle-tag"
                        data-index="${index}"
                        data-tag="${encodeDataAttr(tag)}"
                    >${escapeHtml(tag)}</button>
                `;
            });
            tagsHtml += `</div>`;
            
            extrasHtml = `
                <div class="item-extras">
                    ${tagsHtml}
                    <input
                        type="text"
                        class="note-input"
                        placeholder="Custom note..."
                        value="${escapeAttr(currentNotes)}"
                        data-action="update-note"
                        data-index="${index}"
                    >
                </div>
            `;
        }

        const controls = isSystem ? "" : `
            <div class="qty-control">
                <button type="button" class="qty-btn" data-action="update-qty" data-index="${index}" data-delta="-1">-</button>
                <span>${item.qty}</span>
                <button type="button" class="qty-btn" data-action="update-qty" data-index="${index}" data-delta="1">+</button>
            </div>
        `;

        const safeImage = escapeAttr(item.img || "../image/placeholder.svg");
        const safeName = escapeHtml(item.name);

        const html = `
        <div class="cart-item" style="flex-wrap:wrap; ${rowStyle}">
            <div style="display:flex; width:100%; gap:12px; align-items:center;">
                <img src="${safeImage}" class="cart-item-img" alt="${safeName}">
                <div class="cart-item-details">
                    <span class="cart-item-title">${safeName}</span>
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
        orderId: orderID,
        items: cart,
        total: totalAmount,
        paymentMethod: selectedPaymentMethod,
        status: "new",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        type: currentOrderMode
    };

    if (!stallId) {
        alert("Missing stall mapping for this vendor account.");
        btn.innerHTML = '<i class="fas fa-check-circle"></i> CONFIRM PAYMENT';
        return;
    }

    db.collection("stalls").doc(stallId).collection("active_orders").add(newOrder)
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
