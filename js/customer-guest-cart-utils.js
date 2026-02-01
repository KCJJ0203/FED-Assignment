(function () {
    const CART_KEY = "cart";
    const GUEST_ORDERS_KEY = "guestOrders";
    const SERVICE_RATE = 0.05;
    const DELIVERY_FEE = 3;

    const roundCurrency = (value) => Math.round(value * 100) / 100;

    const formatCurrency = (value) => {
        const safeValue = Number.isFinite(value) ? value : 0;
        return `$${safeValue.toFixed(2)}`;
    };

    const getEmptyCart = () => ({
        items: [],
        subtotal: 0,
        serviceFee: 0,
        deliveryFee: 0,
        grandTotal: 0,
        createdAt: Date.now()
    });

    const normalizeItem = (item) => {
        if (!item || typeof item !== "object") {
            return null;
        }
        const price = Number.parseFloat(item.price);
        const qty = Number.parseInt(item.qty, 10);
        if (!item.itemId || !item.name || !item.stallId) {
            return null;
        }
        return {
            stallId: String(item.stallId),
            stallName: item.stallName ? String(item.stallName) : "",
            hawkerId: item.hawkerId ? String(item.hawkerId) : "",
            hawkerName: item.hawkerName ? String(item.hawkerName) : "",
            itemId: String(item.itemId),
            name: String(item.name),
            imageUrl: item.imageUrl ? String(item.imageUrl) : "",
            price: Number.isFinite(price) ? price : 0,
            qty: Number.isFinite(qty) && qty > 0 ? qty : 1
        };
    };

    const computeTotals = (items, options = {}) => {
        const subtotal = roundCurrency(
            items.reduce((sum, item) => sum + item.price * item.qty, 0)
        );
        const serviceFee = roundCurrency(subtotal * SERVICE_RATE);
        let deliveryFee = 0;
        if (Number.isFinite(options.deliveryFeeOverride)) {
            deliveryFee = roundCurrency(options.deliveryFeeOverride);
        } else if (options.delivery) {
            deliveryFee = DELIVERY_FEE;
        }
        const grandTotal = roundCurrency(subtotal + serviceFee + deliveryFee);
        return { subtotal, serviceFee, deliveryFee, grandTotal };
    };

    const ensureTotals = (cart, options = {}) => {
        if (!Array.isArray(cart.items) || cart.items.length === 0) {
            cart.items = [];
            cart.subtotal = 0;
            cart.serviceFee = 0;
            cart.deliveryFee = 0;
            cart.grandTotal = 0;
            if (!cart.createdAt) {
                cart.createdAt = Date.now();
            }
            return cart;
        }
        const totals = computeTotals(cart.items, options);
        cart.subtotal = totals.subtotal;
        cart.serviceFee = totals.serviceFee;
        cart.deliveryFee = totals.deliveryFee;
        cart.grandTotal = totals.grandTotal;
        if (!cart.createdAt) {
            cart.createdAt = Date.now();
        }
        return cart;
    };

    const resolveDeliveryOptions = (cart, options = {}) => {
        const hasDelivery = Object.prototype.hasOwnProperty.call(options, "delivery");
        const hasOverride = Object.prototype.hasOwnProperty.call(options, "deliveryFeeOverride");
        const delivery = hasDelivery ? options.delivery : cart.deliveryFee > 0;
        let deliveryFeeOverride = options.deliveryFeeOverride;
        if (!hasOverride && delivery) {
            if (Number.isFinite(cart.deliveryFee) && cart.deliveryFee > 0) {
                deliveryFeeOverride = cart.deliveryFee;
            }
        }
        return { delivery, deliveryFeeOverride };
    };

    const readCart = () => {
        const stored = localStorage.getItem(CART_KEY);
        if (!stored) {
            return getEmptyCart();
        }
        try {
            const parsed = JSON.parse(stored);
            if (!parsed || typeof parsed !== "object") {
                return getEmptyCart();
            }
            const cart = {
                ...getEmptyCart(),
                ...parsed
            };
            const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
            cart.items = rawItems
                .map((item) => normalizeItem(item))
                .filter((item) => item);
            const storedDeliveryFee = Number.parseFloat(parsed.deliveryFee);
            const hasStoredDeliveryFee = Number.isFinite(storedDeliveryFee) && storedDeliveryFee > 0;
            return ensureTotals(cart, {
                delivery: hasStoredDeliveryFee,
                deliveryFeeOverride: hasStoredDeliveryFee ? storedDeliveryFee : undefined
            });
        } catch (error) {
            return getEmptyCart();
        }
    };

    const saveCart = (cart) => {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    };

    const updateCartTotals = (cart, options = {}) => {
        return ensureTotals(cart, resolveDeliveryOptions(cart, options));
    };

    const addItem = (item, options = {}) => {
        const cart = readCart();
        const normalized = normalizeItem(item);
        if (!normalized) {
            return cart;
        }
        const existing = cart.items.find(
            (entry) => entry.itemId === normalized.itemId && entry.stallId === normalized.stallId
        );
        if (existing) {
            existing.qty += normalized.qty;
            if (!existing.hawkerId && normalized.hawkerId) {
                existing.hawkerId = normalized.hawkerId;
            }
            if (!existing.hawkerName && normalized.hawkerName) {
                existing.hawkerName = normalized.hawkerName;
            }
            if (!existing.stallName && normalized.stallName) {
                existing.stallName = normalized.stallName;
            }
            if (!existing.imageUrl && normalized.imageUrl) {
                existing.imageUrl = normalized.imageUrl;
            }
        } else {
            cart.items.push(normalized);
        }
        ensureTotals(cart, resolveDeliveryOptions(cart, options));
        saveCart(cart);
        return cart;
    };

    const updateItemQty = (stallId, itemId, qty, options = {}) => {
        const cart = readCart();
        const nextQty = Number.parseInt(qty, 10);
        const index = cart.items.findIndex(
            (entry) => entry.itemId === String(itemId) && entry.stallId === String(stallId)
        );
        if (index === -1) {
            return cart;
        }
        if (!Number.isFinite(nextQty) || nextQty <= 0) {
            cart.items.splice(index, 1);
        } else {
            cart.items[index].qty = nextQty;
        }
        ensureTotals(cart, resolveDeliveryOptions(cart, options));
        saveCart(cart);
        return cart;
    };

    const removeItem = (stallId, itemId, options = {}) => {
        const cart = readCart();
        cart.items = cart.items.filter(
            (entry) => !(entry.itemId === String(itemId) && entry.stallId === String(stallId))
        );
        ensureTotals(cart, resolveDeliveryOptions(cart, options));
        saveCart(cart);
        return cart;
    };

    const clearCart = () => {
        localStorage.removeItem(CART_KEY);
    };

    const getGuestOrders = () => {
        const stored = localStorage.getItem(GUEST_ORDERS_KEY);
        if (!stored) {
            return [];
        }
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const saveGuestOrders = (orders) => {
        localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
    };

    const generateOrderId = () => {
        const base = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `ORD-${base}-${rand}`;
    };

    const groupItemsByStall = (items) => {
        const map = new Map();
        items.forEach((item) => {
            const key = String(item.stallId || "");
            if (!map.has(key)) {
                map.set(key, {
                    stallId: String(item.stallId || ""),
                    stallName: item.stallName || "",
                    hawkerId: item.hawkerId || "",
                    hawkerName: item.hawkerName || "",
                    items: []
                });
            }
            map.get(key).items.push({ ...item });
        });
        return Array.from(map.values());
    };

    const buildOrdersFromCart = (cart, options = {}) => {
        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return [];
        }
        const delivery = Boolean(options.delivery);
        const groups = groupItemsByStall(cart.items);
        const createdAt = Date.now();
        const perOrderDeliveryFee =
            delivery && groups.length > 0 ? roundCurrency(DELIVERY_FEE / groups.length) : 0;

        return groups.map((group, index) => {
            const totals = computeTotals(group.items, {
                delivery: delivery && perOrderDeliveryFee > 0,
                deliveryFeeOverride: delivery ? perOrderDeliveryFee : 0
            });
            return {
                orderId: generateOrderId(),
                userId: Object.prototype.hasOwnProperty.call(options, "userId") ? options.userId : null,
                type: options.type ? options.type : "guest",
                fulfillment: options.fulfillment || "dinein",
                items: group.items,
                totals,
                status: "placed",
                createdAt: createdAt + index,
                stallId: group.stallId,
                stallName: group.stallName,
                hawkerId: group.hawkerId,
                hawkerName: group.hawkerName
            };
        });
    };

    const formatDateTime = (timestamp) => {
        if (!timestamp) {
            return "";
        }
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        return date.toLocaleString();
    };

    window.GuestCart = {
        readCart,
        saveCart,
        updateCartTotals,
        addItem,
        updateItemQty,
        removeItem,
        clearCart,
        getGuestOrders,
        saveGuestOrders,
        buildOrdersFromCart,
        formatCurrency,
        formatDateTime
    };
})();
