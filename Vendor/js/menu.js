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

let allItems = [];

document.addEventListener('DOMContentLoaded', () => {
    loadMenuForAdmin();
});

function loadMenuForAdmin() {
    const grid = document.getElementById('admin-menu-grid');
    grid.innerHTML = '<p>Loading items...</p>';

    db.collection("stalls").doc(MY_STALL_ID).collection("menu_items")
      .get().then((snapshot) => {
          allItems = [];
          grid.innerHTML = '';
          
          if (snapshot.empty) {
              grid.innerHTML = '<p>No items found. Add one!</p>';
              return;
          }

          snapshot.forEach(doc => {
              allItems.push({ id: doc.id, ...doc.data() });
          });

          renderAdminGrid(allItems);
      });
}

function renderAdminGrid(items) {
    const grid = document.getElementById('admin-menu-grid');
    grid.innerHTML = '';
    
    items.forEach(item => {
        const img = item.image || "https://placehold.co/150";
        
        const html = `
        <div class="menu-card" style="position: relative; cursor: default;">
            <img src="${img}" class="menu-img">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <div class="menu-title">${item.name}</div>
                    <div class="menu-price">$${item.price.toFixed(2)}</div>
                    <span class="tag">${item.category}</span>
                </div>
            </div>
            
            <div style="margin-top: 15px; display:flex; gap: 10px;">
                <button onclick="editItem('${item.id}')" class="btn-outline" style="flex:1; padding:5px; font-size:12px;">EDIT</button>
                <button onclick="deleteItem('${item.id}')" class="btn-grey" style="flex:1; padding:5px; font-size:12px; background:#ffebee; color:#d32f2f;">DELETE</button>
            </div>
        </div>
        `;
        grid.innerHTML += html;
    });
}

function filterMenu(category, tabElement) {
    document.querySelectorAll('.cat-pill').forEach(t => t.classList.remove('active'));
    tabElement.classList.add('active');

    if (category === 'All') {
        renderAdminGrid(allItems);
    } else {
        const filtered = allItems.filter(i => i.category === category);
        renderAdminGrid(filtered);
    }
}

function openAddModal() {
    document.getElementById('modal-title').innerText = "Add New Item";
    document.getElementById('edit-doc-id').value = ""; 
    document.getElementById('inp-name').value = "";
    document.getElementById('inp-price').value = "";
    document.getElementById('inp-image').value = "";
    document.getElementById('itemModal').style.display = 'flex';
}

function closeItemModal() {
    document.getElementById('itemModal').style.display = 'none';
}

function editItem(id) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById('modal-title').innerText = "Edit Item";
    document.getElementById('edit-doc-id').value = id; 
    document.getElementById('inp-name').value = item.name;
    document.getElementById('inp-price').value = item.price;
    document.getElementById('inp-category').value = item.category;
    document.getElementById('inp-image').value = item.image;
    
    document.getElementById('itemModal').style.display = 'flex';
}

function saveItem() {
    const id = document.getElementById('edit-doc-id').value;
    const name = document.getElementById('inp-name').value;
    const price = parseFloat(document.getElementById('inp-price').value);
    const category = document.getElementById('inp-category').value;
    const image = document.getElementById('inp-image').value;

    if (!name || !price) {
        alert("Please enter name and price");
        return;
    }

    const itemData = { name, price, category, image };

    if (id) {
        db.collection("stalls").doc(MY_STALL_ID).collection("menu_items").doc(id).update(itemData)
          .then(() => {
              closeItemModal();
              loadMenuForAdmin();
          });
    } else {
        db.collection("stalls").doc(MY_STALL_ID).collection("menu_items").add(itemData)
          .then(() => {
              closeItemModal();
              loadMenuForAdmin();
          });
    }
}

function deleteItem(id) {
    if(confirm("Are you sure you want to delete this dish?")) {
        db.collection("stalls").doc(MY_STALL_ID).collection("menu_items").doc(id).delete()
          .then(() => loadMenuForAdmin());
    }
}