# FED Assignment - NEA Hawker Centre Ordering System

## Overview
A front-end web application for an NEA-style hawker centre ordering experience. Users can browse hawker centres and stalls, add items to a cart, checkout, and view order history.

Orders now use a linked dual-write flow for customer checkout:
- Customer checkout writes order history to Firebase Realtime Database (`orders/{uid}/{orderId}`) for registered users, and browser storage for guests.
- The same checkout writes to Firestore vendor queue at `stalls/{stallId}/active_orders/{orderId}` so vendor order management receives customer orders.
- Vendor POS walk-in flow also writes to `stalls/{stallId}/active_orders`.

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
- Delivery add-on toggle uses `DELIVERY_FEE = 3` and updates totals (`js/customer-guest-cart.js`).
- Cart summary displays item count and stall count (computed using `stallId`). File: `js/customer-guest-cart.js`.
- Per-stall grouping at checkout: items grouped by `stallId` and split into separate orders. Functions: `groupItemsByStall`, `buildOrdersFromCart` in `js/customer-guest-cart-utils.js`.

### Checkout Behavior
- Checkout includes fulfillment options (`dinein` / `takeaway`), a payment result selector (success/fail), and a delivery toggle. File: `customer-guest/cart.html`.
- Validation checks cart presence, fulfillment selection, and payment selector state. Function: `validateForm()` in `js/customer-guest-cart.js`.

On submit steps:
1. Build per-stall orders from cart (`buildOrdersFromCart`).
2. Save customer history to RTDB (registered) or `localStorage` (guest), including `paymentStatus`.
3. For successful payment attempts, dual-write to Firestore vendor queue (`stalls/{stallId}/active_orders/{orderId}`).
4. If payment fails, save order with `paymentStatus = "fail"`, show "Payment failed. Please try again.", do not clear cart, and do not redirect.
5. If payment succeeds, clear cart, write a success payload to `sessionStorage`, and redirect to `orders.html`.
6. Success key: `guestOrderSuccess` containing `orderIds`, `total`, and `count`.

### Order History
Guest order history:
- Stored in `localStorage` key `guestOrders` (`GUEST_ORDERS_KEY`).
- Stored as an array of order objects containing `orderId`, `type: "guest"`, `userId: null`, `fulfillment`, `paymentStatus`, `items`, `totals`, `status`, `createdAt`, and stall/hawker metadata.

Registered order history:
- Stored in Firebase RTDB under `orders/{uid}/{orderId}`.
- Written in `js/customer-guest-cart.js` and loaded in `js/customer-guest-orders.js`.
- If no auth user, orders page falls back to localStorage guest orders.
- Orders are displayed newest-first using `createdAt`, and show `paymentStatus` (SUCCESS/FAIL).

## What We Used (Aligned With FED Topics)
- HTML/CSS for layout and responsive UI.
- JavaScript DOM manipulation and event handling.
- `fetch()` for external APIs.
- Browser storage: `localStorage` and `sessionStorage`.
- Firebase: Auth, Firestore, and Realtime Database.

## Firebase Details
Firebase init is now partially centralized:

- Modular Customer/Auth scripts share `js/firebase-config.js` (`getFirebaseApp()` helper).
- Vendor compat scripts share `Vendor/js/firebase-init.js`.
- Remaining duplicated/inline config still exists in NEA pages and classic scripts:
  - `js/customer-guest-cart.js`
  - `js/customer-guest-orders.js`
  - `NEA/index.html`
  - `NEA/calendar.html`
  - `NEA/history.html`
  - `NEA/inspection.html`
  - `NEA/inspect-stall.html`
  - `NEA/report.html`
  - `NEA/today.html`

Firebase products used:
- Auth: login, registered vs guest flow, and sign-out for guest mode.
- Firestore: `users/{uid}`, `hawkers`, `stalls`, `stalls/{stallId}/menu_items`, and Vendor `stalls/{stallId}/active_orders`.
- Realtime Database: customer order history under `orders/{uid}/{orderId}` and review-related paths.

## User Types & Routing
User routing based on `userType`:
- `customer` -> `customer-guest/index.html`
- `vendor` -> `Vendor/index.html`
- `nea` -> `NEA/index.html`
- `admin` -> `Admin/Home.html`
- `guest` -> `customer-guest/index.html`

Note: folder casing is `Vendor`, `NEA`, `Admin` on disk, and routes should match this casing on case-sensitive hosting.

## APIs / Data Sources
- data.gov.sg API: hawker centre list in `js/customer-guest-hawkers.js`.
- JSONPlaceholder: stall mock data used in the live flow in `js/customer-guest-hawkers.js`.

## How to Run
1. Open the project folder in VS Code.
2. Run using Live Server.
3. Start from `index.html`.

## Deployment
- [(Link)](https://kcjj0203.github.io/FED-Assignment/)

## File Structure (Actual)
```text
/
  Admin/
    Analytics.html
    Home.html
    Report.html
  NEA/
    calendar.html
    history.html
    index.html
    inspect-stall.html
    inspection.html
    report.html
    today.html
  Vendor/
    CSS/
      style.css
    js/
      firebase-init.js
      index.js
      menu.js
      notifications.js
      orders.js
      pos.js
      settings.js
    index.html
    menu.html
    notifications.html
    orders.html
    pos.html
    settings.html
  customer-guest/
    account.html
    cart.html
    index.html
    orders.html
  css/
    customer-guest.css
    main.css
  image/
    default-hawker.jpg
    placeholder.svg
    ...jpg assets
  js/
    customer-guest-account.js
    customer-guest-cart-utils.js
    customer-guest-cart.js
    firebase-config.js
    index.js
    login.js
    customer-guest-orders.js
    customer-guest-hawkers.js
    forgotpassword.js
    signup.js
  credits.html
  forgotpassword.html
  index.html
  login.html
  signup.html
  README.md
```

## Credits / References
See [credits.html](credits.html) for the full credits list (including image sources).

## Known Limitations
- Payment success/failure is simulated; no real payment integration.
- Failed payments do not redirect to Orders; the user remains on checkout.
- Some legacy scripts/pages still initialize Firebase inline (NEA pages + selected classic customer scripts).

## Future Improvements
- Add real payment integration.
- Add stronger checkout validation (address/payment details).
