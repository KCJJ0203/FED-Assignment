const db = window.vendorDb || firebase.firestore();
let vendorContext = null;

document.addEventListener("DOMContentLoaded", () => {
  bindOrderEvents();
  initOrdersPage();
});

async function initOrdersPage() {
  setBoardLoading();
  try {
    vendorContext = await window.getVendorContext();
    subscribeToOrders();
  } catch (error) {
    console.error("Vendor orders initialization failed:", error);
    setBoardError("Unable to load vendor orders because account context is unavailable.");
  }
}

function getActiveOrdersRef() {
  if (!vendorContext?.stallId) {
    throw new Error("Missing vendor stall context.");
  }
  return db.collection("stalls").doc(vendorContext.stallId).collection("active_orders");
}

function bindOrderEvents() {
  document.getElementById("new-walkin-btn")?.addEventListener("click", () => {
    window.location.href = "pos.html";
  });

  document.querySelector(".kanban-board")?.addEventListener("click", (event) => {
    const statusButton = event.target.closest("[data-action='update-status']");
    if (!statusButton) return;

    const docId = decodeDataValue(statusButton.dataset.docId);
    const status = String(statusButton.dataset.status || "").trim();
    if (!docId || !status) return;
    updateStatus(docId, status);
  });
}

function setBoardLoading() {
  document.getElementById("list-new").innerHTML =
    '<div class="order-card"><div class="order-items">Loading orders...</div></div>';
  document.getElementById("list-cooking").innerHTML = "";
  document.getElementById("list-ready").innerHTML = "";
  updateCounts({ new: 0, cooking: 0, ready: 0 });
}

function setBoardError(message) {
  const safeMessage = escapeHtml(message);
  document.getElementById("list-new").innerHTML = `
    <div class="order-card" style="border-color:#ef4444;">
      <div class="order-items" style="color:#b91c1c;">${safeMessage}</div>
    </div>
  `;
  document.getElementById("list-cooking").innerHTML = "";
  document.getElementById("list-ready").innerHTML = "";
  updateCounts({ new: 0, cooking: 0, ready: 0 });
}

function renderColumnEmptyState(listId, label) {
  const list = document.getElementById(listId);
  if (!list || list.children.length > 0) return;
  list.innerHTML = `
    <div class="order-card">
      <div class="order-items" style="color:#64748b;">No ${escapeHtml(label)} orders.</div>
    </div>
  `;
}

function subscribeToOrders() {
  getActiveOrdersRef()
    .orderBy("timestamp", "asc")
    .onSnapshot(
      (snapshot) => {
        const newList = document.getElementById("list-new");
        const cookingList = document.getElementById("list-cooking");
        const readyList = document.getElementById("list-ready");
        newList.innerHTML = "";
        cookingList.innerHTML = "";
        readyList.innerHTML = "";

        const counts = { new: 0, cooking: 0, ready: 0 };
        const allOrders = [];
        snapshot.forEach((record) => {
          allOrders.push(normalizeOrder({ id: record.id, ...record.data() }));
        });

        const newStatusOrders = allOrders.filter((entry) => entry.status === "new");
        const latestNewOrderId =
          newStatusOrders.length > 0
            ? newStatusOrders[newStatusOrders.length - 1].id
            : null;

        allOrders.forEach((order) => {
          const showNewBadge = order.id === latestNewOrderId;
          createOrderCard(order, order.id, showNewBadge);
          if (counts[order.status] !== undefined) counts[order.status] += 1;
        });

        renderColumnEmptyState("list-new", "new");
        renderColumnEmptyState("list-cooking", "cooking");
        renderColumnEmptyState("list-ready", "ready");
        updateCounts(counts);
      },
      (error) => {
        console.error("Failed to subscribe to active orders:", error);
        setBoardError("Unable to load orders. Please refresh and try again.");
      }
    );
}

function normalizeOrder(order) {
  const normalizedType = String(order.type || "").toLowerCase();
  const normalizedFulfillment = String(order.fulfillment || "").toLowerCase();
  let displayType = order.type || "Walk-In";

  if (normalizedType === "delivery" || normalizedFulfillment === "delivery") {
    displayType = "Delivery";
  } else if (
    normalizedType === "takeaway" ||
    normalizedType === "take-away" ||
    normalizedFulfillment === "takeaway"
  ) {
    displayType = "Takeaway";
  } else if (
    normalizedType === "walk-in" ||
    normalizedType === "walkin" ||
    normalizedType === "dine-in" ||
    normalizedType === "dinein" ||
    normalizedFulfillment === "dinein"
  ) {
    displayType = "Walk-In";
  }

  return {
    ...order,
    orderID: order.orderID || order.orderId || order.id,
    type: displayType,
    status: String(order.status || "new").toLowerCase(),
    items: Array.isArray(order.items) ? order.items : []
  };
}

function createOrderCard(order, docId, showNewBadge) {
  let containerId = "";
  let actionButtons = "";

  const hasTakeaway =
    order.items &&
    order.items.some((item) => {
      const itemName = String(item?.name || "").toLowerCase();
      return itemName === "takeaway" || itemName === "takeaway box";
    });

  let displayType = order.type;
  let iconHtml = '<i class="fas fa-utensils"></i>';
  let typeClass = "type-walkin";

  if (hasTakeaway) {
    displayType = "TAKEAWAY";
    iconHtml = '<i class="fas fa-shopping-bag"></i>';
    typeClass = "type-delivery";
  } else if (order.type === "Walk-In") {
    displayType = "DINE-IN";
    typeClass = "type-walkin";
  } else if (order.type === "Delivery") {
    displayType = "DELIVERY";
    iconHtml = '<i class="fas fa-motorcycle"></i>';
    typeClass = "type-delivery";
  } else if (order.type === "Takeaway") {
    displayType = "TAKEAWAY";
    iconHtml = '<i class="fas fa-shopping-bag"></i>';
    typeClass = "type-delivery";
  }

  let itemsHtml = "";
  order.items.forEach((item) => {
    const itemName = String(item?.name || "");
    if (itemName !== "Takeaway Box") {
      const qty = Number(item?.qty || 1);
      const noteText = String(item?.notes || "");
      itemsHtml += `<div>${qty}x ${escapeHtml(itemName || "Item")} <span class="note">${escapeHtml(
        noteText
      )}</span></div>`;
    }
  });

  const encodedDocId = encodeDataValue(docId);
  if (order.status === "new") {
    containerId = "list-new";
    actionButtons = `
      <button class="btn-grey" type="button" data-action="update-status" data-doc-id="${encodedDocId}" data-status="cooking">
        <i class="fas fa-fire"></i> Start Cooking
      </button>
    `;
  } else if (order.status === "cooking") {
    containerId = "list-cooking";
    actionButtons = `
      <div class="btn-group" style="display:grid; grid-template-columns:1fr 2fr; gap:10px;">
        <button class="btn-outline" type="button" disabled>EDIT</button>
        <button class="btn-green" type="button" data-action="update-status" data-doc-id="${encodedDocId}" data-status="ready">
          <i class="fas fa-check"></i> Ready
        </button>
      </div>
    `;
  } else if (order.status === "ready") {
    containerId = "list-ready";
    actionButtons = `
      <button class="btn-grey" type="button" data-action="update-status" data-doc-id="${encodedDocId}" data-status="completed">
        <i class="fas fa-archive"></i> Complete
      </button>
    `;
  } else {
    return;
  }

  const safeOrderId = escapeHtml(order.orderID || "#---");
  const html = `
    <div class="order-card" id="${escapeAttr(docId)}">
      ${showNewBadge ? '<div class="badge-new">NEW</div>' : ""}
      <div class="card-top">
        <div class="id-group">
          <div class="icon-box walkin">${iconHtml}</div>
          <div>
            <div class="order-id">${safeOrderId}</div>
            <div class="order-type ${typeClass}">${displayType}</div>
          </div>
        </div>
        <div class="timer">Just now</div>
      </div>
      <div class="order-items">${itemsHtml}</div>
      <div class="action-area">${actionButtons}</div>
    </div>
  `;

  const container = document.getElementById(containerId);
  if (container) container.innerHTML += html;
}

function updateStatus(docId, newStatus) {
  if (!docId || !newStatus) return;

  if (newStatus === "completed") {
    getActiveOrdersRef()
      .doc(docId)
      .delete()
      .catch((error) => {
        console.error("Failed to complete order:", error);
      });
    return;
  }

  getActiveOrdersRef()
    .doc(docId)
    .update({ status: newStatus })
    .catch((error) => {
      console.error("Failed to update order status:", error);
    });
}

function updateCounts(counts) {
  document.getElementById("count-new").innerText = String(counts.new || 0);
  document.getElementById("count-cooking").innerText = String(counts.cooking || 0);
  document.getElementById("count-ready").innerText = String(counts.ready || 0);
}

function encodeDataValue(value) {
  return encodeURIComponent(String(value ?? ""));
}

function decodeDataValue(value) {
  try {
    return decodeURIComponent(String(value ?? ""));
  } catch (error) {
    return String(value ?? "");
  }
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
