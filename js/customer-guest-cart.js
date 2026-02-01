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

    const isDeliverySelected = () => false;

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

    const renderCart = (cart) => {
        const isEmpty = cart.items.length === 0;
        if (cartEmptyEl) {
            cartEmptyEl.classList.toggle("is-hidden", !isEmpty);
        }
        cartItemsEl.classList.toggle("is-hidden", isEmpty);

        if (isEmpty) {
            cartSummaryEl.textContent = "Your cart is empty.";
            renderTotals(cart);
            return;
        }

        const stallCount = new Set(cart.items.map((item) => item.stallId)).size;
        const itemCount = cart.items.reduce((sum, item) => sum + item.qty, 0);
        cartSummaryEl.textContent = `${itemCount} item(s) from ${stallCount} stall(s).`;
        renderCartItems(cart);
        renderTotals(cart);
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
        if (formErrorEl) {
            formErrorEl.textContent = "";
        }
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
                formErrorEl.textContent = "Add items to your cart before placing an order.";
            }
            return { valid: false };
        }

        const fulfillment = checkoutForm.querySelector('input[name="fulfillment"]:checked')?.value;
        return { valid: true, fulfillment };
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

    const saveOrdersToRtdb = async (orders, user = null) => {
        if (!orders || orders.length === 0) {
            return false;
        }
        try {
            const { getDatabase, ref, set } = await import(
                "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js"
            );
            const resolvedUser = user || (await getAuthUser());
            if (!resolvedUser) {
                return false;
            }
            const [{ initializeApp, getApps }] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js")
            ]);
            const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
            const db = getDatabase(app);
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

    const placeOrder = async (fulfillment) => {
        if (!window.GuestCart) {
            return;
        }
        const cart = window.GuestCart.readCart();
        const authUser = await getAuthUser();
        const isRegistered = Boolean(authUser);
        const userId = authUser ? authUser.uid : null;
        const orders = window.GuestCart.buildOrdersFromCart(cart, {
            fulfillment,
            type: isRegistered ? "registered" : "guest",
            userId
        });
        if (orders.length === 0) {
            if (formErrorEl) {
                formErrorEl.textContent = "Add items to your cart before placing an order.";
            }
            return;
        }
        let savedOk = true;
        if (isRegistered) {
            savedOk = await saveOrdersToRtdb(orders, authUser);
        } else {
            const existing = window.GuestCart.getGuestOrders();
            const merged = [...orders, ...existing];
            window.GuestCart.saveGuestOrders(merged);
        }
        if (!savedOk) {
            if (formErrorEl) {
                formErrorEl.textContent = "Could not save your order. Please try again.";
            }
            return;
        }
        window.GuestCart.clearCart();

        const totalAmount = orders.reduce((sum, order) => sum + order.totals.grandTotal, 0);
        sessionStorage.setItem(
            "guestOrderSuccess",
            JSON.stringify({
                orderIds: orders.map((order) => order.orderId),
                total: totalAmount,
                count: orders.length
            })
        );

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
            await placeOrder(validation.fulfillment);
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
    if (checkoutForm && initialCart.deliveryFee > 0) {
        const deliveryRadio = checkoutForm.querySelector("input[name=\"fulfillment\"][value=\"delivery\"]");
        if (deliveryRadio) {
            deliveryRadio.checked = true;
        }
    }
    toggleDeliveryFields(isDeliverySelected());
    renderCart(initialCart);
    updateTotals();
})();
