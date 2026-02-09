(function () {
    const ordersListEl = document.getElementById("orders-list");
    const ordersStatusEl = document.getElementById("orders-status");
    const ordersEmptyEl = document.getElementById("orders-empty");
    const successEl = document.getElementById("payment-success");
    const trackBtn = document.getElementById("payment-track");
    const reviewModal = document.getElementById("review-modal");
    const reviewStall = document.getElementById("review-stall");
    const reviewClose = document.getElementById("review-close");
    const reviewCancel = document.getElementById("review-cancel");
    const reviewForm = document.getElementById("review-form");
    const reviewErr = document.getElementById("review-error");
    const reviewTitle = document.getElementById("review-input-title");
    const reviewMsg = document.getElementById("review-input-msg");
    const reviewRating = document.getElementById("review-rating");
    const reviewStars = document.getElementById("review-stars");

    let reviewTarget = null; 

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

    const storageApi = window.AppStorage || null;
    const storageKeys = storageApi ? storageApi.KEYS : {};
    const CHECKOUT_SUCCESS_KEY = storageKeys.CHECKOUT_SUCCESS || "guestOrderSuccess";

    const getRealtimeDb = async () => {
        if (!window.AppFirebase || typeof window.AppFirebase.getRealtimeDb !== "function") {
            throw new Error("AppFirebase.getRealtimeDb is unavailable.");
        }
        return window.AppFirebase.getRealtimeDb();
    };

    const setReviewError = (msg) => {
        if (!reviewErr) return;
        reviewErr.textContent = msg || "";
        reviewErr.classList.toggle("is-hidden", !msg);
    };

    const openReview = (target) => {
        reviewTarget = target;

        if (reviewStall) reviewStall.textContent = `Stall: ${target.stallName || "-"}`;
        if (reviewTitle) reviewTitle.value = "";
        if (reviewMsg) reviewMsg.value = "";
        if (reviewRating) reviewRating.value = "0";
        setReviewError("");

        reviewModal?.classList.remove("is-hidden");
        reviewModal?.setAttribute("aria-hidden", "false");
        reviewModal?.querySelectorAll(".rstar").forEach(s => s.classList.remove("on"));
    };

    const closeReview = () => {
        reviewModal?.classList.add("is-hidden");
        reviewModal?.setAttribute("aria-hidden", "true");
        reviewTarget = null;
    };

    reviewClose?.addEventListener("click", closeReview);
    reviewCancel?.addEventListener("click", closeReview);
    reviewModal?.addEventListener("click", (e) => {
        if (e.target?.classList?.contains("review-backdrop")) closeReview();
    });

    reviewStars?.addEventListener("click", (e) => {
        const s = e.target.closest(".rstar");
        if (!s) return;
        const v = Number(s.dataset.v);
        reviewRating.value = String(v);
        reviewStars.querySelectorAll(".rstar").forEach(st => {
            st.classList.toggle("on", Number(st.dataset.v) <= v);
        });
    });

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
            card.dataset.orderId = order.orderId || "";
            card.dataset.stallId = order.stallId || "";      
            card.dataset.stallName = order.stallName || "";  

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

            
            const reviewBtn = document.createElement("button");
            reviewBtn.type = "button";
            reviewBtn.className = "order-review";
            reviewBtn.dataset.action = "review";
            reviewBtn.textContent = "Leave a review";

            const isSuccess = (order.paymentStatus || "success").toLowerCase() === "success";
            if (!isSuccess || !order.stallId) {
                reviewBtn.classList.add("is-hidden");
            }

            card.append(header, total, toggleBtn, itemsList, reviewBtn);
            fragment.appendChild(card);
        });

        ordersListEl.appendChild(fragment);
    };

    const showSuccessBanner = () => {
        if (!successEl) {
            return;
        }
        const storedPayload = storageApi && typeof storageApi.readJSON === "function"
            ? storageApi.readJSON(sessionStorage, CHECKOUT_SUCCESS_KEY, null)
            : (() => {
                const raw = sessionStorage.getItem(CHECKOUT_SUCCESS_KEY);
                if (!raw) {
                    return null;
                }
                try {
                    return JSON.parse(raw);
                } catch (error) {
                    return null;
                }
            })();
        if (!storedPayload) {
            return;
        }
        try {
            successEl.classList.remove("is-hidden");
            ordersStatusEl.parentElement?.parentElement?.classList.add("is-hidden");
            if (storageApi && typeof storageApi.remove === "function") {
                storageApi.remove(sessionStorage, CHECKOUT_SUCCESS_KEY);
            } else {
                sessionStorage.removeItem(CHECKOUT_SUCCESS_KEY);
            }
        } catch (error) {
            if (storageApi && typeof storageApi.remove === "function") {
                storageApi.remove(sessionStorage, CHECKOUT_SUCCESS_KEY);
            } else {
                sessionStorage.removeItem(CHECKOUT_SUCCESS_KEY);
            }
        }
    };

    
    ordersListEl.addEventListener("click", async (event) => {
        
        const toggleBtn = event.target.closest("[data-action=\"toggle\"]");
        if (toggleBtn) {
            const card = toggleBtn.closest(".order-card");
            if (!card) return;

            const items = card.querySelector(".order-items");
            if (!items) return;

            const isHidden = items.classList.toggle("is-hidden");
            toggleBtn.textContent = isHidden ? "View details" : "Hide details";
            return;
        }

        
        const reviewBtn = event.target.closest("[data-action='review']");
        if (!reviewBtn) return;

        const card = reviewBtn.closest(".order-card");
        if (!card) return;

        const user = await getAuthUser();
        if (!user) {
            alert("Please login to leave a review.");
            return;
        }

        const stallId = card.dataset.stallId;
        const stallName = card.dataset.stallName;
        const orderId = card.dataset.orderId;

        if (!stallId) {
            alert("Missing stallId in order. Please store stallId when saving the order.");
            return;
        }

        openReview({
            uid: user.uid,
            userEmail: user.email || "",
            orderId,
            stallId,
            stallName
        });
    });

    const getAuthUser = async () => {
        try {
            if (!window.AppFirebase || typeof window.AppFirebase.getAuthUser !== "function") {
                throw new Error("AppFirebase.getAuthUser is unavailable.");
            }
            return await window.AppFirebase.getAuthUser(1200);
        } catch (error) {
            console.warn("Unable to resolve auth user for orders:", error);
            return null;
        }
    };

    const loadOrdersFromRtdb = async (user) => {
        try {
            const { ref, get } = await import(
                "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js"
            );
            if (!user) {
                return null;
            }

            const db = await getRealtimeDb();
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

    
    reviewForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        setReviewError("");

        if (!reviewTarget) return setReviewError("Missing review target.");

        const rating = Number(reviewRating.value || 0);
        const title = reviewTitle.value.trim();
        const message = reviewMsg.value.trim();

        if (!rating) return setReviewError("Select a rating.");
        if (!title) return setReviewError("Enter a title.");
        if (!message) return setReviewError("Enter your message.");

        try {
            const { ref, push, set } = await import(
                "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js"
            );

            const rtdb = await getRealtimeDb();

            const payload = {
                orderId: reviewTarget.orderId,
                stallId: reviewTarget.stallId,
                stallName: reviewTarget.stallName || "",
                userId: reviewTarget.uid,
                userEmail: reviewTarget.userEmail || "",
                rating,
                title,
                message,
                createdAt: Date.now()
            };

            
            const stallReviewRef = push(ref(rtdb, `reviews/${reviewTarget.stallId}`));
            await set(stallReviewRef, payload);

            
            const userReviewRef = push(ref(rtdb, `userReviews/${reviewTarget.uid}`));
            await set(userReviewRef, payload);

            closeReview();
            alert("Review submitted!");
                } catch (err) {
        console.error("Review submit error:", err);
        setReviewError(`${err?.code || ""} ${err?.message || "Failed to submit review."}`.trim());
        }

    });

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
