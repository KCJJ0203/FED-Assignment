(() => {
  const KEYS = Object.freeze({
    USER_TYPE: "userType",
    CART: "cart",
    GUEST_ORDERS: "guestOrders",
    CHECKOUT_SUCCESS: "guestOrderSuccess",
    CUSTOMER_PREFS: "cg_prefs",
    FAVORITE_HAWKERS: "cg_fav_hawker",
    FAVORITE_STALLS: "cg_fav_stall",
    FAVORITE_DISHES: "cg_fav_dish",
    NEA_SCHEDULES: "neaSchedules",
    NEA_INSPECTIONS: "neaInspections",
    NEA_SELECTED_CENTRE_ID: "selectedHawkerCentreId",
    NEA_SELECTED_CENTRE_NAME: "selectedHawkerCentreName",
    NEA_SELECTED_STALL_ID: "selectedStallId",
    NEA_SCHEDULE_DATE: "scheduleDate",
    NEA_SCHEDULE_TIME: "scheduleTime",
    NEA_SELECTED_REPORT_ID: "selectedReportId",
    NEA_SELECTED_CALENDAR_DATE: "selectedCalendarDate",
    NEA_SELECTED_CALENDAR_STALL_ID: "selectedCalendarStallId",
    NEA_SELECTED_CALENDAR_CENTRE_ID: "selectedCalendarCentreId",
    NEA_THIS_WEEK_INSPECTIONS: "thisWeekInspections",
    NEA_DRAFT_PREFIX: "inspectionDraft_"
  });

  function readJSON(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(storage, key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function remove(storage, key) {
    storage.removeItem(key);
  }

  window.AppStorage = {
    KEYS,
    readJSON,
    writeJSON,
    remove
  };
})();
