const db = window.vendorDb || firebase.firestore();
let vendorContext = null;
let allItems = [];

document.addEventListener("DOMContentLoaded", () => {
  bindMenuUiEvents();
  initMenuPage();
});

async function initMenuPage() {
  try {
    vendorContext = await window.getVendorContext();
    loadMenuForAdmin();
  } catch (error) {
    console.error("Vendor menu initialization failed:", error);
    const grid = document.getElementById("admin-menu-grid");
    if (grid) {
      grid.innerHTML =
        '<p style="color:#b91c1c;">Unable to load menu because vendor access is unavailable.</p>';
    }
  }
}

function getMenuCollectionRef() {
  if (!vendorContext?.stallId) {
    throw new Error("Missing vendor stall context.");
  }
  return db.collection("stalls").doc(vendorContext.stallId).collection("menu_items");
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

function bindMenuUiEvents() {
  document.getElementById("openAddModalBtn")?.addEventListener("click", openAddModal);
  document
    .getElementById("closeItemModalBtn")
    ?.addEventListener("click", closeItemModal);
  document.getElementById("saveItemBtn")?.addEventListener("click", saveItem);

  document.querySelectorAll(".cat-pill[data-category]").forEach((tab) => {
    tab.addEventListener("click", () => {
      filterMenu(tab.dataset.category, tab);
    });
  });

  document.getElementById("admin-menu-grid")?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-menu-action]");
    if (!actionButton) return;

    const itemId = actionButton.dataset.itemId;
    if (!itemId) return;

    if (actionButton.dataset.menuAction === "edit") {
      editItem(itemId);
      return;
    }

    if (actionButton.dataset.menuAction === "delete") {
      deleteItem(itemId);
    }
  });
}

function loadMenuForAdmin() {
  const grid = document.getElementById("admin-menu-grid");
  if (!grid) return;
  grid.innerHTML = "<p>Loading items...</p>";

  getMenuCollectionRef()
    .get()
    .then((snapshot) => {
      allItems = [];
      if (snapshot.empty) {
        grid.innerHTML = "<p>No items found. Add one.</p>";
        return;
      }

      snapshot.forEach((record) => {
        allItems.push({ id: record.id, ...record.data() });
      });
      renderAdminGrid(allItems);
    })
    .catch((error) => {
      console.error("Failed to load menu for admin:", error);
      grid.innerHTML =
        '<p style="color:#b91c1c;">Unable to load menu items right now.</p>';
    });
}

function renderAdminGrid(items) {
  const grid = document.getElementById("admin-menu-grid");
  if (!grid) return;
  grid.innerHTML = "";

  items.forEach((item) => {
    const img = item.image || "https://placehold.co/150";
    const name = escapeHtml(item.name);
    const category = escapeHtml(item.category);
    const itemId = escapeAttr(item.id);
    const safePrice = Number(item.price);
    const displayPrice = Number.isFinite(safePrice) ? safePrice.toFixed(2) : "0.00";

    const html = `
      <div class="menu-card" style="position: relative; cursor: default;">
        <img src="${escapeAttr(img)}" class="menu-img" alt="${name}">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div>
            <div class="menu-title">${name}</div>
            <div class="menu-price">$${displayPrice}</div>
            <span class="tag">${category}</span>
          </div>
        </div>

        <div style="margin-top: 15px; display:flex; gap: 10px;">
          <button type="button" data-menu-action="edit" data-item-id="${itemId}" class="btn-outline" style="flex:1; padding:5px; font-size:12px;">EDIT</button>
          <button type="button" data-menu-action="delete" data-item-id="${itemId}" class="btn-grey" style="flex:1; padding:5px; font-size:12px; background:#ffebee; color:#d32f2f;">DELETE</button>
        </div>
      </div>
    `;
    grid.innerHTML += html;
  });
}

function filterMenu(category, tabElement) {
  document.querySelectorAll(".cat-pill").forEach((tab) => tab.classList.remove("active"));
  if (tabElement) {
    tabElement.classList.add("active");
  }

  if (category === "All") {
    renderAdminGrid(allItems);
    return;
  }

  const filtered = allItems.filter((item) => item.category === category);
  renderAdminGrid(filtered);
}

function openAddModal() {
  document.getElementById("modal-title").innerText = "Add New Item";
  document.getElementById("edit-doc-id").value = "";
  document.getElementById("inp-name").value = "";
  document.getElementById("inp-price").value = "";
  document.getElementById("inp-image").value = "";
  document.getElementById("itemModal").style.display = "flex";
}

function closeItemModal() {
  document.getElementById("itemModal").style.display = "none";
}

function editItem(id) {
  const item = allItems.find((entry) => entry.id === id);
  if (!item) return;

  document.getElementById("modal-title").innerText = "Edit Item";
  document.getElementById("edit-doc-id").value = id;
  document.getElementById("inp-name").value = item.name;
  document.getElementById("inp-price").value = item.price;
  document.getElementById("inp-category").value = item.category;
  document.getElementById("inp-image").value = item.image;
  document.getElementById("itemModal").style.display = "flex";
}

function saveItem() {
  const id = document.getElementById("edit-doc-id").value;
  const name = document.getElementById("inp-name").value.trim();
  const price = Number.parseFloat(document.getElementById("inp-price").value);
  const category = document.getElementById("inp-category").value;
  const image = document.getElementById("inp-image").value.trim();

  if (!name || !Number.isFinite(price)) {
    alert("Please enter a valid item name and price.");
    return;
  }

  const itemData = { name, price, category, image };
  const collectionRef = getMenuCollectionRef();

  const request = id
    ? collectionRef.doc(id).update(itemData)
    : collectionRef.add(itemData);

  request
    .then(() => {
      closeItemModal();
      loadMenuForAdmin();
    })
    .catch((error) => {
      console.error("Failed to save menu item:", error);
      alert("Unable to save the menu item. Please try again.");
    });
}

function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this dish?")) return;
  getMenuCollectionRef()
    .doc(id)
    .delete()
    .then(() => loadMenuForAdmin())
    .catch((error) => {
      console.error("Failed to delete menu item:", error);
      alert("Unable to delete this menu item right now.");
    });
}
