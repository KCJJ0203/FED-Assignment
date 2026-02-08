(function () {
    const cartItemsEl = document.getElementById("cart-items");
    const cartEmptyEl = document.getElementById("cart-empty");
    const cartSummaryEl = document.getElementById("cart-summary");
    const subtotalEl = document.getElementById("total-subtotal");
    const serviceEl = document.getElementById("total-service");
    const deliveryEl = document.getElementById("total-delivery");
    const grandEl = document.getElementById("total-grand");
    const checkoutForm = document.getElementById("checkout-form");
    const deliveryFieldsEl = document.getElementById("delivery-fields");
    const formErrorEl = document.getElementById("form-error");
    const paymentResultEl = document.getElementById("paymentResult");
    const paymentMsgEl = document.getElementById("payment-msg");
    const deliveryToggleEl = document.getElementById("deliveryToggle");

    if (!cartItemsEl || !cartSummaryEl || !subtotalEl || !serviceEl || !deliveryEl || !grandEl) {
        return;
    }

    const formatCurrency = (value) => {
        if (window.GuestCart && typeof window.GuestCart.formatCurrency === "function") {
            return window.GuestCart.formatCurrency(value);
        }
        const safeValue = Number.isFinite(value) ? value : 0;
        return `$${safeValue.toFixed(2)}`;
    };

    const getSelectedValue = (name) => {
        const selected = checkoutForm
            ? checkoutForm.querySelector(`input[name="${name}"]:checked`)
            : null;
        return selected ? selected.value : "";
    };

    const isDeliverySelected = () => Boolean(deliveryToggleEl && deliveryToggleEl.checked);

    const toggleDeliveryFields = () => {
        if (!deliveryFieldsEl) {
            return;
        }
        deliveryFieldsEl.classList.add("is-hidden");
    };

    const updateTotals = () => {
        if (!window.GuestCart) {
            return null;
        }
        const cart = window.GuestCart.readCart();
        const updated = window.GuestCart.updateCartTotals(cart, {
            delivery: isDeliverySelected()
        });
        window.GuestCart.saveCart(updated);
        renderTotals(updated);
        return updated;
    };

    const renderTotals = (cart) => {
        subtotalEl.textContent = formatCurrency(cart.subtotal);
        serviceEl.textContent = formatCurrency(cart.serviceFee);
        deliveryEl.textContent = formatCurrency(cart.deliveryFee);
        grandEl.textContent = formatCurrency(cart.grandTotal);
    };

    const renderCartItems = (cart) => {
        cartItemsEl.innerHTML = "";
        const fragment = document.createDocumentFragment();
        cart.items.forEach((item) => {
            const itemEl = document.createElement("article");
            itemEl.className = "cart-item";
            itemEl.dataset.stallId = item.stallId;
            itemEl.dataset.itemId = item.itemId;

            const thumb = document.createElement("div");
            thumb.className = "cart-item-thumb";

            if (item.imageUrl) {
                const img = document.createElement("img");
                img.src = item.imageUrl;
                img.alt = item.name;
                img.loading = "lazy";
                img.addEventListener("error", () => {
                    img.remove();
                });
                thumb.appendChild(img);
            }

            const info = document.createElement("div");
            info.className = "cart-item-info";

            const name = document.createElement("h3");
            name.className = "cart-item-name";
            name.textContent = item.name;

            const meta = document.createElement("p");
            meta.className = "cart-item-meta";
            const hawkerText = item.hawkerName ? `${item.hawkerName} • ` : "";
            meta.textContent = `${hawkerText}${item.stallName || "Stall"}`;

            const price = document.createElement("div");
            price.className = "cart-item-price";
            price.textContent = formatCurrency(item.price * item.qty);

            const controls = document.createElement("div");
            controls.className = "cart-item-controls";

            const decreaseBtn = document.createElement("button");
            decreaseBtn.type = "button";
            decreaseBtn.className = "qty-btn";
            decreaseBtn.dataset.action = "decrease";
            decreaseBtn.textContent = "-";

            const qtyValue = document.createElement("span");
            qtyValue.className = "qty-value";
            qtyValue.textContent = String(item.qty);

            const increaseBtn = document.createElement("button");
            increaseBtn.type = "button";
            increaseBtn.className = "qty-btn";
            increaseBtn.dataset.action = "increase";
            increaseBtn.textContent = "+";

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-btn";
            removeBtn.dataset.action = "remove";
            removeBtn.textContent = "×";

            controls.append(decreaseBtn, qtyValue, increaseBtn);

            const footer = document.createElement("div");
            footer.className = "cart-item-footer";
            footer.append(price, controls);

            info.append(name, meta, footer);
            itemEl.append(thumb, info, removeBtn);
            fragment.appendChild(itemEl);
        });
        cartItemsEl.appendChild(fragment);
    };

    const clearFormError = () => {
        if (formErrorEl) {
            formErrorEl.textContent = "";
        }
    };

    const clearPaymentMsg = () => {
        if (paymentMsgEl) {
            paymentMsgEl.textContent = "";
        }
    };

    const renderCart = (cart) => {
        const isEmpty = cart.items.length === 0;
        if (cartEmptyEl) {
            cartEmptyEl.classList.toggle("is-hidden", !isEmpty);
        }
        cartItemsEl.classList.toggle("is-hidden", isEmpty);

        if (isEmpty) {
            cartSummaryEl.textContent = "Your cart is empty.";
            renderTotals(cart);
            clearFormError();
            clearPaymentMsg();
            return;
        }

        const stallCount = new Set(cart.items.map((item) => item.stallId)).size;
        const itemCount = cart.items.reduce((sum, item) => sum + item.qty, 0);
        cartSummaryEl.textContent = `${itemCount} item(s) from ${stallCount} stall(s).`;
        renderCartItems(cart);
        renderTotals(cart);
        clearFormError();
        clearPaymentMsg();
    };

    const clearFormErrors = () => {
        if (!checkoutForm) {
            return;
        }
        checkoutForm.querySelectorAll(".field-error").forEach((el) => {
            el.textContent = "";
        });
        checkoutForm.querySelectorAll(".is-invalid").forEach((el) => {
            el.classList.remove("is-invalid");
        });
        clearFormError();
        clearPaymentMsg();
    };

    const setFieldError = (fieldId, message) => {
        if (!checkoutForm) {
            return;
        }
        const errorEl = checkoutForm.querySelector(`[data-error-for="${fieldId}"]`);
        if (errorEl) {
            errorEl.textContent = message;
        }
        const inputEl = checkoutForm.querySelector(`#${fieldId}`);
        if (inputEl) {
            inputEl.classList.add("is-invalid");
        }
    };

    const setGroupError = (groupName, message) => {
        if (!checkoutForm) {
            return;
        }
        const errorEl = checkoutForm.querySelector(`[data-error-for="${groupName}"]`);
        if (errorEl) {
            errorEl.textContent = message;
        }
        const groupEl = checkoutForm.querySelector(`[data-group="${groupName}"]`);
        if (groupEl) {
            groupEl.classList.add("is-invalid");
        }
    };

    const clearGroupError = (groupName) => {
        if (!checkoutForm) {
            return;
        }
        const errorEl = checkoutForm.querySelector(`[data-error-for="${groupName}"]`);
        if (errorEl) {
            errorEl.textContent = "";
        }
        const groupEl = checkoutForm.querySelector(`[data-group="${groupName}"]`);
        if (groupEl) {
            groupEl.classList.remove("is-invalid");
        }
    };

    const validateForm = () => {
        clearFormErrors();
        if (!checkoutForm || !window.GuestCart) {
            return { valid: false };
        }

        const cart = window.GuestCart.readCart();
        if (cart.items.length === 0) {
            if (formErrorEl) {
                formErrorEl.textContent = "Your cart is empty. Add items before placing an order.";
            }
            return { valid: false };
        }

        const fulfillment = checkoutForm.querySelector('input[name="fulfillment"]:checked')?.value;
        if (!["dinein", "takeaway"].includes(fulfillment)) {
            setGroupError("fulfillment", "Please choose dine-in or takeaway.");
            return { valid: false };
        }

        const paymentStatus = paymentResultEl ? paymentResultEl.value : "";
        if (!["success", "fail"].includes(paymentStatus)) {
            if (formErrorEl) {
                formErrorEl.textContent = "Please choose a payment result.";
            }
            return { valid: false };
        }

        return {
            valid: true,
            fulfillment,
            paymentStatus
        };
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

    const getFirestoreDb = async () => {
        if (!window.AppFirebase || typeof window.AppFirebase.getFirestoreDb !== "function") {
            throw new Error("AppFirebase.getFirestoreDb is unavailable.");
        }
        return window.AppFirebase.getFirestoreDb();
    };

    const getAuthUser = async () => {
        try {
            if (!window.AppFirebase || typeof window.AppFirebase.getAuthUser !== "function") {
                throw new Error("AppFirebase.getAuthUser is unavailable.");
            }
            return await window.AppFirebase.getAuthUser(1200);
        } catch (error) {
            console.warn("Unable to resolve auth user:", error);
            return null;
        }
    };

    const saveOrdersToRtdb = async (orders, user = null) => {
        if (!orders || orders.length === 0) {
            return false;
        }
        try {
            const { ref, set } = await import(
                "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js"
            );
            const resolvedUser = user || (await getAuthUser());
            if (!resolvedUser) {
                return false;
            }
            const db = await getRealtimeDb();
            await Promise.all(
                orders.map((order) =>
                    set(ref(db, `orders/${resolvedUser.uid}/${order.orderId}`), order)
                )
            );
            return true;
        } catch (error) {
            console.warn("RTDB order save failed:", error);
            return false;
        }
    };

    const mapOrderTypeForVendor = (order) => {
        const normalizedFulfillment = String(order?.fulfillment || "").toLowerCase();
        if (normalizedFulfillment === "takeaway") {
            return "Takeaway";
        }
        const deliveryFee = Number(order?.totals?.deliveryFee || 0);
        if (deliveryFee > 0) {
            return "Delivery";
        }
        return "Walk-In";
    };

    const buildVendorOrderPayload = (order, nowMs, Timestamp) => {
        const orderId = String(order?.orderId || "").trim();
        const safeCreatedAt = Number.isFinite(Number(order?.createdAt))
            ? Number(order.createdAt)
            : nowMs;
        const items = Array.isArray(order?.items)
            ? order.items.map((item) => ({
                ...item,
                name: String(item?.name || "Item"),
                qty: Number(item?.qty || 1)
            }))
            : [];
        return {
            orderID: orderId,
            orderId,
            items,
            total: Number(order?.totals?.grandTotal || order?.total || 0),
            status: "new",
            timestamp: Timestamp.fromMillis(nowMs),
            type: mapOrderTypeForVendor(order),
            fulfillment: String(order?.fulfillment || "dinein"),
            paymentStatus: String(order?.paymentStatus || "success"),
            customerType: String(order?.type || "guest"),
            userId: order?.userId || null,
            createdAt: safeCreatedAt,
            stallId: String(order?.stallId || ""),
            stallName: String(order?.stallName || ""),
            hawkerId: String(order?.hawkerId || ""),
            hawkerName: String(order?.hawkerName || "")
        };
    };

    const saveOrdersToVendorQueue = async (orders) => {
        if (!orders || orders.length === 0) {
            return false;
        }
        try {
            const { doc, setDoc, Timestamp } = await import(
                "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js"
            );
            const db = await getFirestoreDb();
            await Promise.all(
                orders.map((order) => {
                    const stallId = String(order?.stallId || "").trim();
                    const orderId = String(order?.orderId || "").trim();
                    if (!stallId || !orderId) {
                        throw new Error("Missing stallId/orderId for vendor queue write.");
                    }
                    const nowMs = Date.now();
                    const payload = buildVendorOrderPayload(order, nowMs, Timestamp);
                    return setDoc(
                        doc(db, "stalls", stallId, "active_orders", orderId),
                        payload,
                        { merge: true }
                    );
                })
            );
            return true;
        } catch (error) {
            console.warn("Vendor queue write failed:", error);
            return false;
        }
    };

    const placeOrder = async ({ fulfillment, paymentStatus }) => {
        if (!window.GuestCart) {
            return;
        }
        clearPaymentMsg();
        const cart = window.GuestCart.readCart();
        const authUser = await getAuthUser();
        const isRegistered = Boolean(authUser);
        const userId = authUser ? authUser.uid : null;
        const orders = window.GuestCart.buildOrdersFromCart(cart, {
            fulfillment,
            type: isRegistered ? "registered" : "guest",
            userId,
            paymentStatus
        });
        if (orders.length === 0) {
            if (formErrorEl) {
                formErrorEl.textContent = "Your cart is empty. Add items before placing an order.";
            }
            return;
        }

        let customerSaveOk = true;
        if (isRegistered) {
            customerSaveOk = await saveOrdersToRtdb(orders, authUser);
        } else {
            const existing = window.GuestCart.getGuestOrders();
            const merged = [...orders, ...existing];
            window.GuestCart.saveGuestOrders(merged);
        }
        if (!customerSaveOk) {
            if (formErrorEl) {
                formErrorEl.textContent = "Could not save your order. Please try again.";
            }
            return;
        }

        // Dual-write successful orders into each stall's active queue for vendor fulfillment.
        if (paymentStatus !== "fail") {
            const vendorSaveOk = await saveOrdersToVendorQueue(orders);
            if (!vendorSaveOk) {
                if (formErrorEl) {
                    formErrorEl.textContent = "Order saved, but vendor queue update failed. Please try again.";
                }
                return;
            }
        }

        if (paymentStatus === "fail") {
            if (paymentMsgEl) {
                paymentMsgEl.textContent = "Payment failed. Please try again.";
            }
            return;
        }
        window.GuestCart.clearCart();

        const totalAmount = orders.reduce((sum, order) => sum + order.totals.grandTotal, 0);
        const successPayload = {
            orderIds: orders.map((order) => order.orderId),
            total: totalAmount,
            count: orders.length
        };
        if (storageApi && typeof storageApi.writeJSON === "function") {
            storageApi.writeJSON(sessionStorage, CHECKOUT_SUCCESS_KEY, successPayload);
        } else {
            sessionStorage.setItem(CHECKOUT_SUCCESS_KEY, JSON.stringify(successPayload));
        }

        window.location.href = "orders.html";
    };

    if (cartItemsEl) {
        cartItemsEl.addEventListener("click", (event) => {
            const actionBtn = event.target.closest("[data-action]");
            if (!actionBtn || !window.GuestCart) {
                return;
            }
            const itemEl = event.target.closest(".cart-item");
            if (!itemEl) {
                return;
            }
            const stallId = itemEl.dataset.stallId;
            const itemId = itemEl.dataset.itemId;
            const action = actionBtn.dataset.action;
            const qtyValueEl = itemEl.querySelector(".qty-value");
            const currentQty = qtyValueEl ? Number.parseInt(qtyValueEl.textContent, 10) : 1;
            let updatedCart = null;

            if (action === "increase") {
                updatedCart = window.GuestCart.updateItemQty(
                    stallId,
                    itemId,
                    currentQty + 1,
                    { delivery: isDeliverySelected() }
                );
            }

            if (action === "decrease") {
                updatedCart = window.GuestCart.updateItemQty(
                    stallId,
                    itemId,
                    currentQty - 1,
                    { delivery: isDeliverySelected() }
                );
            }

            if (action === "remove") {
                updatedCart = window.GuestCart.removeItem(stallId, itemId, {
                    delivery: isDeliverySelected()
                });
            }

            if (updatedCart) {
                renderCart(updatedCart);
            }
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener("change", (event) => {
            if (event.target && (event.target.name === "fulfillment" || event.target.name === "payment")) {
                clearGroupError(event.target.name);
            }
            if (event.target && event.target.id === "paymentResult") {
                clearPaymentMsg();
            }
            if (event.target && event.target.id === "deliveryToggle") {
                clearFormError();
                updateTotals();
            }
            if (event.target && event.target.name === "fulfillment") {
                toggleDeliveryFields();
                updateTotals();
            }
        });

        checkoutForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const validation = validateForm();
            if (!validation.valid) {
                return;
            }
            await placeOrder(validation);
        });

        checkoutForm.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", () => {
                if (!input.id) {
                    return;
                }
                const errorEl = checkoutForm.querySelector(`[data-error-for="${input.id}"]`);
                if (errorEl) {
                    errorEl.textContent = "";
                }
                input.classList.remove("is-invalid");
            });
        });
    }

    const initialCart = window.GuestCart ? window.GuestCart.readCart() : { items: [] };
    if (deliveryToggleEl && initialCart.deliveryFee > 0) {
        deliveryToggleEl.checked = true;
    }
    toggleDeliveryFields(isDeliverySelected());
    renderCart(initialCart);
    updateTotals();
})();
