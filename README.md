# FED Assignment - NEA Hawker Centre Ordering System

## Overview
A front-end web application for an NEA-style hawker centre ordering experience. Users can browse hawker centres and stalls, add items to a cart, checkout, and view order history.

Orders are stored differently depending on user type:
- Guest users are stored locally in the browser.
- Registered users are stored in Firebase Realtime Database (RTDB), tied to the logged-in user.

## Team & Roles (With Student IDs)
- Ten Yen Kiat James (S10275024K) - Buyer: customer ordering, checkout, and order history (guest/local + registered/DB).
- Htet Myat Aung (S10268492G) - Account management and engagement (login/out, preferences, feedback, likes, payment methods). Planned/design scope.
- Ngoo Kah Chun (S10269307) - Vendor/operations features (notification hub, queue management, walk-in digitization, analytics, menu and sustainability control). Planned/design scope.
- Niranjan Palani Selvam (S10272462A) - Regulatory and compliance/inspection system (scheduling, logging, grades, filtering, autosave). Planned/design scope.
- Ding Yi Xian (S10275030G) - Admin/operator analytics and vendor contract management. Planned/design scope.

## Buyer Scope (Member 1)

### Cart Features Implemented
- Add to cart from menu via `window.GuestCart.addItem(...)`. File: `js/customer-guest-hawkers.js`.
- Update quantity (+ / -) and remove items. File: `js/customer-guest-cart.js` (uses `updateItemQty` / `removeItem`).
- Persistent cart in `localStorage` key `cart`. Structure handled by `js/customer-guest-cart-utils.js`.
- Totals are computed and stored on the cart object.
- Subtotal + 5% service fee (`SERVICE_RATE = 0.05`).
- Delivery fee logic exists (`DELIVERY_FEE = 3`) but delivery selection is disabled in UI because `isDeliverySelected()` returns `false` in `js/customer-guest-cart.js`.
- Cart summary displays item count and stall count (computed using `stallId`). File: `js/customer-guest-cart.js`.
- Per-stall grouping at checkout: items grouped by `stallId` and split into separate orders. Functions: `groupItemsByStall`, `buildOrdersFromCart` in `js/customer-guest-cart-utils.js`.

### Checkout Behavior
- Checkout form includes fulfillment options only: `dinein` / `takeaway`. File: `customer-guest/cart.html`.
- Validation is minimal: checks cart has items, otherwise shows "Add items to your cart before placing an order." Function: `validateForm()` in `js/customer-guest-cart.js`.

On submit steps:
1. Build per-stall orders from cart (`buildOrdersFromCart`).
2. If logged in, save orders to RTDB and clear cart.
3. If guest, save orders to `localStorage` and clear cart.
4. Write a success payload to `sessionStorage` and redirect to `orders.html`.
5. Success key: `guestOrderSuccess` containing `orderIds`, `total`, and `count`.

### Order History
Guest order history:
- Stored in `localStorage` key `guestOrders` (`GUEST_ORDERS_KEY`).
- Stored as an array of order objects containing `orderId`, `type: "guest"`, `userId: null`, `fulfillment`, `items`, `totals`, `status`, `createdAt`, and stall/hawker metadata.

Registered order history:
- Stored in Firebase RTDB under `orders/{uid}/{orderId}`.
- Written in `js/customer-guest-cart.js` and loaded in `js/customer-guest-orders.js`.
- If no auth user, orders page falls back to localStorage guest orders.

## What We Used (Aligned With FED Topics)
- HTML/CSS for layout and responsive UI.
- JavaScript DOM manipulation and event handling.
- `fetch()` for external APIs.
- Browser storage: `localStorage` and `sessionStorage`.
- Firebase: Auth, Firestore, and Realtime Database.

## Firebase Details
Firebase config is included in multiple files (no single `firebase.js`):
- `js/index.js`
- `js/login.js`
- `js/customer-guest-cart.js`
- `js/customer-guest-orders.js`
- `js/customer-guest-hawkers.js`

Firebase products used:
- Auth: login, registered vs guest flow, and sign-out for guest mode.
- Firestore: `users/{uid}` for user type routing, and `hawkers` / `stalls` collections for custom records.
- Realtime Database (orders): `orders/{uid}/{orderId}`.

## User Types & Routing
User routing based on `userType`:
- `customer` -> `customer-guest/index.html`
- `vendor` -> `vendor/index.html`
- `nea` -> `nea/index.html`
- `admin` -> `admin/index.html`
- `guest` -> `customer-guest/index.html`

Note: folder casing is `Vendor`, `NEA`, `Admin` on disk. Routes in `js/login.js` use lowercase. Case-sensitive hosting will require matching folder names or updated routes.

## APIs / Data Sources
- data.gov.sg API: hawker centre list in `js/customer-guest-hawkers.js`.
- JSONPlaceholder: stall mock data used in the live flow in `js/customer-guest-hawkers.js`.

## How to Run
1. Open the project folder in VS Code.
2. Run using Live Server.
3. Start from `index.html`.

## File Structure (Actual)
```text
/
  Admin/
    index.html
  NEA/
    index.html
  Vendor/
    index.html
    orders.html
    css/
      style.css
    js/
      orders.js
  customer-guest/
    index.html
    cart.html
    orders.html
    account.html
  css/
    main.css
    customer-guest.css
  image/
    ...jpg assets
  js/
    index.js
    login.js
    customer-guest-hawkers.js
    customer-guest-cart.js
    customer-guest-cart-utils.js
    customer-guest-orders.js
  index.html
  login.html
  README.md
```

## Credits / References
- Google Fonts (Sora): https://fonts.googleapis.com/css2?family=Sora
- Font Awesome CDN: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css
- UI Avatars: https://ui-avatars.com/
- Hawker centre data: https://data.gov.sg/
- Stall mock data: https://jsonplaceholder.typicode.com/
- Image sources: to be added by the team.

## Known Limitations
- Delivery fee logic exists, but delivery selection is disabled in the UI.
- Payment success/failure is simulated; no real payment integration.

## Future Improvements
- Enable delivery selection UI and apply delivery fees correctly.
- Add a proper payment failure state or dedicated failure page.