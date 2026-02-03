(function () {
    const ordersListEl = document.getElementById("orders-list");
    const ordersStatusEl = document.getElementById("orders-status");
    const ordersEmptyEl = document.getElementById("orders-empty");
    const successEl = document.getElementById("payment-success");
    const trackBtn = document.getElementById("payment-track");

    if (!ordersListEl || !ordersStatusEl) {
        return;
    }

    const formatCurrency = (value) => {
        if (window.GuestCart && typeof window.GuestCart.formatCurrency === "function") {
            return window.GuestCart.formatCurrency(value);
        }
        const safeValue = Number.isFinite(value) ? value : 0;
        return `$${safeValue.toFixed(2)}`;
    };

    const formatDate = (timestamp) => {
        if (window.GuestCart && typeof window.GuestCart.formatDateTime === "function") {
            return window.GuestCart.formatDateTime(timestamp);
        }
        const date = new Date(timestamp);
        return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
    };

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

    const renderOrders = (orders) => {
        ordersListEl.innerHTML = "";
        if (!orders || orders.length === 0) {
            ordersStatusEl.textContent = "No orders yet.";
            if (ordersEmptyEl) {
                ordersEmptyEl.classList.remove("is-hidden");
            }
            return;
        }

        if (ordersEmptyEl) {
            ordersEmptyEl.classList.add("is-hidden");
        }

        ordersStatusEl.textContent = `Showing ${orders.length} order(s).`;
        const fragment = document.createDocumentFragment();

        orders.forEach((order) => {
            const card = document.createElement("article");
            card.className = "order-card";
            card.dataset.orderId = order.orderId;
            const paymentLabel = (order.paymentStatus || "success").toUpperCase();

            const header = document.createElement("div");
            header.className = "order-header";

            const headerInfo = document.createElement("div");

            const title = document.createElement("h3");
            title.className = "order-title";
            title.textContent = order.stallName || "Order";

            const meta = document.createElement("p");
            meta.className = "order-meta";
            const dateLabel = formatDate(order.createdAt);
            const fulfillmentLabel = order.fulfillment === "takeaway" ? "Takeaway" : "Dine In";
            meta.textContent = `${dateLabel} - ${order.orderId} • ${fulfillmentLabel}`;

            const paymentMeta = document.createElement("p");
            paymentMeta.className = "order-meta";
            paymentMeta.textContent = `Payment: ${paymentLabel}`;

            headerInfo.append(title, meta, paymentMeta);

            const status = document.createElement("span");
            status.className = "order-status";
            status.textContent = paymentLabel;

            header.append(headerInfo, status);

            const total = document.createElement("div");
            total.className = "order-total";
            const grandTotal = order.totals && Number.isFinite(order.totals.grandTotal)
                ? order.totals.grandTotal
                : 0;
            total.textContent = `Total: ${formatCurrency(grandTotal)}`;

            const toggleBtn = document.createElement("button");
            toggleBtn.type = "button";
            toggleBtn.className = "order-toggle";
            toggleBtn.dataset.action = "toggle";
            toggleBtn.textContent = "View details";

            const itemsList = document.createElement("div");
            itemsList.className = "order-items is-hidden";

            const paymentRow = document.createElement("div");
            paymentRow.className = "order-item-row";

            const paymentName = document.createElement("span");
            paymentName.textContent = "Payment";

            const paymentValue = document.createElement("span");
            paymentValue.textContent = paymentLabel;

            paymentRow.append(paymentName, paymentValue);
            itemsList.appendChild(paymentRow);

            (order.items || []).forEach((item) => {
                const row = document.createElement("div");
                row.className = "order-item-row";

                const name = document.createElement("span");
                name.textContent = `${item.qty} x ${item.name}`;

                const price = document.createElement("span");
                price.textContent = formatCurrency(item.price * item.qty);

                row.append(name, price);
                itemsList.appendChild(row);
            });

            card.append(header, total, toggleBtn, itemsList);
            fragment.appendChild(card);
        });

        ordersListEl.appendChild(fragment);
    };

    const showSuccessBanner = () => {
        if (!successEl) {
            return;
        }
        const stored = sessionStorage.getItem("guestOrderSuccess");
        if (!stored) {
            return;
        }
        try {
            JSON.parse(stored);
            successEl.classList.remove("is-hidden");
            ordersStatusEl.parentElement?.parentElement?.classList.add("is-hidden");
            sessionStorage.removeItem("guestOrderSuccess");
        } catch (error) {
            sessionStorage.removeItem("guestOrderSuccess");
        }
    };

    ordersListEl.addEventListener("click", (event) => {
        const toggleBtn = event.target.closest("[data-action=\"toggle\"]");
        if (!toggleBtn) {
            return;
        }
        const card = toggleBtn.closest(".order-card");
        if (!card) {
            return;
        }
        const items = card.querySelector(".order-items");
        if (!items) {
            return;
        }
        const isHidden = items.classList.toggle("is-hidden");
        toggleBtn.textContent = isHidden ? "View details" : "Hide details";
    });

    const getAuthUser = async () => {
        try {
            const [{ initializeApp, getApps }, { getAuth, onAuthStateChanged }] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js"),
                import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js")
            ]);

            const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
            const auth = getAuth(app);

            return await new Promise((resolve) => {
                const timer = setTimeout(() => {
                    unsub();
                    resolve(auth.currentUser || null);
                }, 1200);

                const unsub = onAuthStateChanged(auth, (user) => {
                    clearTimeout(timer);
                    unsub();
                    resolve(user || null);
                });
            });
        } catch (error) {
            return null;
        }
    };

    const loadOrdersFromRtdb = async (user) => {
        try {
            const [{ initializeApp, getApps }] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js")
            ]);
            const { getDatabase, ref, get } = await import(
                "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js"
            );

            const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
            if (!user) {
                return null;
            }

            const db = getDatabase(app);
            const snap = await get(ref(db, `orders/${user.uid}`));
            if (!snap.exists()) {
                return [];
            }
            const data = snap.val();
            return Object.values(data || {});
        } catch (error) {
            console.warn("Failed to load RTDB orders:", error);
            return [];
        }
    };

    const init = async () => {
        const authUser = await getAuthUser();
        const isRegistered = Boolean(authUser);
        let orders = [];

        if (isRegistered) {
            const rtdbOrders = await loadOrdersFromRtdb(authUser);
            orders = Array.isArray(rtdbOrders) ? rtdbOrders : [];
        } else {
            orders = window.GuestCart ? window.GuestCart.getGuestOrders() : [];
        }

        const sortedOrders = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        renderOrders(sortedOrders);
        showSuccessBanner();
    };

    if (trackBtn) {
        trackBtn.addEventListener("click", () => {
            if (successEl) {
                successEl.classList.add("is-hidden");
            }
            ordersStatusEl.parentElement?.parentElement?.classList.remove("is-hidden");
        });
    }

    init();
})();
