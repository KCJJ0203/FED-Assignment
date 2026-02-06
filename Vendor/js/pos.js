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

document.addEventListener('DOMContentLoaded', () => {
    fetchMenu();
    setupEventListeners();
    renderCart();
});

function fetchMenu() {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '<p>Loading menu...</p>';

    const sortOrder = {
        "Mains": 1,
        "Sides": 2,
        "Drinks": 3,
        "Add-ons": 4,
        "Sets": 5
    };

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
            allMenuItems.push(data); 
        });

        allMenuItems.sort((a, b) => {
            const orderA = sortOrder[a.category] || 99;
            const orderB = sortOrder[b.category] || 99;
            return orderA - orderB;
        });

        renderMenu(allMenuItems);

    }).catch((error) => {
        console.error("Error loading menu:", error);
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
            <div class="menu-card" onclick="addToCart('${item.name}', ${item.price}, '${imageSrc}')">
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
            
            if (category === "All" || category === "Show All") {
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

function addToCart(name, price, image) {
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ name, price, qty: 1, img: image });
    }
    renderCart();
}

function updateQty(index, change) {
    if (cart[index].qty + change > 0) {
        cart[index].qty += change;
    } else {
        cart.splice(index, 1);
    }
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-container');
    container.innerHTML = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        const html = `
        <div class="cart-item">
            <img src="${item.img}" class="cart-item-img">
            <div class="cart-item-details">
                <span class="cart-item-title">${item.name}</span>
                <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
            </div>
            <div class="qty-control">
                <span class="qty-btn" onclick="updateQty(${index}, -1)">-</span>
                <span>${item.qty}</span>
                <span class="qty-btn" onclick="updateQty(${index}, 1)">+</span>
            </div>
        </div>`;
        container.innerHTML += html;
    });

    document.getElementById('cart-total').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-subtotal').innerText = `$${subtotal.toFixed(2)}`;
}
