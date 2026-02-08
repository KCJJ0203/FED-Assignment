import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getFirebaseApp } from "./firebase-config.js";

(function () {
    const API_URL = "https://data.gov.sg/api/action/datastore_search?resource_id=d_68a42f09f350881996d83f9cd73ab02f&limit=200";
    const STALLS_URL = "https://jsonplaceholder.typicode.com/posts?_limit=30";
    const STORAGE_KEY = "selectedHawkerCentre";
    const listEl = document.getElementById("hawker-list");
    const statusEl = document.getElementById("hawker-status");
    const hawkerTitleEl = document.getElementById("hawker-title");
    const searchInput = document.getElementById("hawker-search");
    const clearButton = document.getElementById("hawker-clear");
    const hawkerFlowEl = document.getElementById("hawker-flow");
    const filterButtons = hawkerFlowEl ? Array.from(hawkerFlowEl.querySelectorAll("[data-filter]")) : [];
    const stallSectionEl = document.getElementById("stall-section");
    const stallBackButton = document.getElementById("stall-back");
    const stallHawkerNameEl = document.getElementById("stall-hawker-name");
    const stallPageTitleEl = document.getElementById("stall-page-title");
    const stallListEl = document.getElementById("stall-list");
    const stallStatusEl = document.getElementById("stall-status");
    const stallSearchInput = document.getElementById("stall-search");
    const stallClearButton = document.getElementById("stall-clear");
    const stallFilterButtons = stallSectionEl
        ? Array.from(stallSectionEl.querySelectorAll("[data-stall-filter]"))
        : [];
    const menuSectionEl = document.getElementById("menu-section");
    const menuListEl = document.getElementById("menu-list");
    const menuStatusEl = document.getElementById("menu-status");
    const menuModalEl = document.getElementById("menu-modal");
    const menuModalImgEl = document.getElementById("menu-modal-img");
    const menuModalBackBtn = document.getElementById("menu-modal-back");
    const menuModalNameEl = document.getElementById("menu-modal-name");
    const menuModalStallEl = document.getElementById("menu-modal-stall");
    const menuModalRatingEl = document.getElementById("menu-modal-rating");
    const menuModalTimeEl = document.getElementById("menu-modal-time");
    const menuModalDescEl = document.getElementById("menu-modal-desc");
    const menuModalPriceEl = document.getElementById("menu-modal-price");
    const menuModalQtyEl = document.getElementById("menu-modal-qty");
    const menuModalAddBtn = document.getElementById("menu-modal-add");
    const cartToastEl = document.getElementById("cart-toast");
    let recordsCache = [];
    let hasSelection = false;
    let handlerAttached = false;
    let controlsAttached = false;
    let currentHawkerId = null;
    let autoShowStalls = true;
    let stallsCache = [];
    let stallsLoaded = false;
    let stallsLoading = false;
    let stallControlsAttached = false;
    let stallHandlerAttached = false;
    let hasStallSelection = false;
    let menuHandlerAttached = false;
    let toastTimeout = null;
    let isMenuMode = false;
    let currentHawkerName = "Hawker Centre";
    let currentStallName = "";
    let modalItem = null;
    let modalQty = 1;
    let currentHawkerSource = "none";
    let firebaseHawkers = [];
    let firebaseStalls = [];
    const firebaseMenuCache = new Map();
    const firebaseMenuInFlight = new Map();
    let menuRenderToken = 0;
    const hasStallUi = Boolean(stallSectionEl && stallListEl && stallStatusEl && stallSearchInput);
    const hasMenuUi = Boolean(menuSectionEl && menuListEl && menuStatusEl);
    const filters = {
        popular: false,
        government: false,
        typeHc: false,
        typeMhc: false,
        large: false,
        market: false
    };
    const stallFilters = {
        open: false,
        gradeA: false,
        popular: false
    };
    const hawkerHours = ["8am-5pm", "9am-7pm", "10am-8pm", "7am-3pm"];

    if (!listEl || !statusEl) {
        return;
    }

const FAV_KEYS = {
    hawker: "cg_fav_hawker",
    stall: "cg_fav_stall",
    dish: "cg_fav_dish"
};

function readFavs(type) {
    try {
        const raw = localStorage.getItem(FAV_KEYS[type]);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function writeFavs(type, list) {
    localStorage.setItem(FAV_KEYS[type], JSON.stringify(list));
}

function isFavorite(type, id) {
    const list = readFavs(type);
    return list.some(x => String(x.id) === String(id));
}

function toggleFavorite(type, item) {
    const list = readFavs(type);
    const id = String(item.id);
    const index = list.findIndex(x => String(x.id) === id);
    
    if (index >= 0) {
        
        list.splice(index, 1);
        writeFavs(type, list);
        window.dispatchEvent(new CustomEvent("cg:favs-updated", { detail: { type } }));
        return false;
    } else {
        
        list.push(item);
        writeFavs(type, list);
        window.dispatchEvent(new CustomEvent("cg:favs-updated", { detail: { type } }));
        return true;
    }
    }
    let db = null;
    try {
        const app = getFirebaseApp();
        db = getFirestore(app);
    } catch (error) {
        console.warn("Firebase not initialized:", error);
    }

    const setStatus = (message) => {
        statusEl.textContent = message;
    };

    const setStallStatus = (message) => {
        if (stallStatusEl) {
            stallStatusEl.textContent = message;
        }
    };

    const setMenuStatus = (message) => {
        if (menuStatusEl) {
            menuStatusEl.textContent = message;
        }
    };

    const getImageCandidates = (url) => {
        if (!url) {
            return [];
        }
        const normalized = url.replace(/\\/g, "/").trim();
        const candidates = [];
        if (normalized.startsWith("http") || normalized.startsWith("data:")) {
            return [normalized];
        }
        try {
            candidates.push(new URL(normalized, window.location.href).toString());
        } catch (error) {
            
        }
        if (normalized.startsWith("/")) {
            candidates.push(normalized, `..${normalized}`);
            return Array.from(new Set(candidates));
        }
        if (normalized.startsWith("../")) {
            const withoutPrefix = normalized.replace(/^(\.\.\/)+/, "/");
            candidates.push(normalized, withoutPrefix);
            return Array.from(new Set(candidates));
        }
        if (normalized.startsWith("./")) {
            const cleaned = normalized.slice(2);
            candidates.push(`../${cleaned}`, `/${cleaned}`, cleaned);
            return Array.from(new Set(candidates));
        }
        candidates.push(`../${normalized}`, `/${normalized}`, normalized);
        return Array.from(new Set(candidates));
    };

    const applyThumbImage = (thumb, imageUrl, fallbackText) => {
        const candidates = getImageCandidates(imageUrl);
        if (candidates.length === 0) {
            thumb.textContent = fallbackText;
            return;
        }
        const img = document.createElement("img");
        img.alt = fallbackText;
        img.loading = "lazy";
        let index = 0;

        const tryNext = () => {
            if (index >= candidates.length) {
                thumb.classList.remove("has-image");
                thumb.textContent = fallbackText;
                return;
            }
            img.src = candidates[index];
            index += 1;
        };

        img.addEventListener("error", tryNext);
        thumb.classList.add("has-image");
        thumb.appendChild(img);
        tryNext();
    };

    const resetMenu = () => {
        if (!hasMenuUi) {
            return;
        }
        menuListEl.innerHTML = "";
        setMenuStatus("Select a stall to view menu.");
    };

    const hideMenu = () => {
        if (!menuSectionEl) {
            return;
        }
        menuSectionEl.classList.add("is-hidden");
    };

    const showMenu = () => {
        if (!menuSectionEl) {
            return;
        }
        menuSectionEl.classList.remove("is-hidden");
    };

    const enterMenuMode = () => {
        isMenuMode = true;
        if (stallSectionEl) {
            stallSectionEl.classList.add("is-menu-only");
        }
        if (stallPageTitleEl) {
            stallPageTitleEl.textContent = currentStallName || "Menu";
        }
        if (stallHawkerNameEl) {
            stallHawkerNameEl.textContent = currentStallName || "Back to stalls";
        }
        if (stallBackButton) {
            stallBackButton.setAttribute("aria-label", "Back to stalls");
        }
        showMenu();
    };

    const exitMenuMode = () => {
        menuRenderToken += 1;
        isMenuMode = false;
        if (stallSectionEl) {
            stallSectionEl.classList.remove("is-menu-only");
        }
        if (stallPageTitleEl) {
            stallPageTitleEl.textContent = "Select a Stall";
        }
        if (stallHawkerNameEl) {
            stallHawkerNameEl.textContent = currentHawkerName;
        }
        if (stallBackButton) {
            stallBackButton.setAttribute("aria-label", "Back to hawker centres");
        }
        hideMenu();
        resetMenu();
    };

    const updateStallHeaderName = (hawkerName) => {
        if (!stallHawkerNameEl) {
            return;
        }
        currentHawkerName = hawkerName || "Hawker Centre";
        if (!isMenuMode) {
            stallHawkerNameEl.textContent = currentHawkerName;
        }
    };

    const updateCurrentHawkerSource = () => {
        if (!currentHawkerId) {
            currentHawkerSource = "none";
            return;
        }
        const match = recordsCache.find((record) => String(record._id) === String(currentHawkerId));
        currentHawkerSource = match && match.source === "firebase" ? "firebase" : "api";
    };

    const showHawkerFlow = () => {
        if (hawkerFlowEl) {
            hawkerFlowEl.classList.remove("is-hidden");
        }
        if (stallSectionEl) {
            stallSectionEl.classList.add("is-hidden");
        }
        exitMenuMode();
        autoShowStalls = false;
        if (hawkerTitleEl) {
            hawkerTitleEl.textContent = "Select a hawker centre";
        }
        setStallStatus("Select a hawker centre to view stalls.");
    };

    const showStallSection = (hawkerName) => {
        if (!stallSectionEl) {
            return;
        }
        if (hawkerFlowEl) {
            hawkerFlowEl.classList.add("is-hidden");
        }
        if (stallPageTitleEl) {
            stallPageTitleEl.textContent = "Select a Stall";
        }
        stallSectionEl.classList.remove("is-hidden");
        exitMenuMode();
        autoShowStalls = true;
        updateStallHeaderName(hawkerName);
        attachStallControls();
        attachMenuHandler();
        if (stallsLoaded) {
            applyStallFilter();
            return;
        }
        ensureStallsLoaded();
    };

    const getCount = (value) => {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const toAreaFromLocation = (location) => {
        if (!location) {
            return "";
        }
        const parts = location.split(",");
        return parts[0].trim();
    };

    const getHawkerRating = (record) => {
        const rating = Number(record.rating);
        if (Number.isFinite(rating) && rating > 0) {
            return rating;
        }
        const seed = Number.parseInt(record._id, 10) || 1;
        return Number((4 + (seed % 8) / 10).toFixed(1));
    };

    const getHawkerHours = (record) => {
        if (record.hours) {
            return record.hours;
        }
        const seed = Number.parseInt(record._id, 10) || 1;
        return hawkerHours[seed % hawkerHours.length];
    };

    const toFilterKey = (filterName) => {
        if (!filterName) {
            return "";
        }
        return filterName
            .split("-")
            .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
            .join("");
    };

    const updateClearButton = () => {
        if (!clearButton || !searchInput) {
            return;
        }
        const hasValue = searchInput.value.trim().length > 0;
        clearButton.classList.toggle("is-visible", hasValue);
    };

    const updateStallClearButton = () => {
        if (!stallClearButton || !stallSearchInput) {
            return;
        }
        const hasValue = stallSearchInput.value.trim().length > 0;
        stallClearButton.classList.toggle("is-visible", hasValue);
    };

    const resetStallFilters = () => {
        stallFilters.open = false;
        stallFilters.gradeA = false;
        stallFilters.popular = false;
        stallFilterButtons.forEach((button) => {
            button.classList.remove("is-active");
        });
    };

    const buildCard = (record) => {
        const item = document.createElement("li");
        item.className = "hawker-item";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "hawker-card";
        button.setAttribute("aria-pressed", "false");
        button.dataset.centreId = String(record._id);

        const thumb = document.createElement("span");
        thumb.className = "hawker-thumb";
        applyThumbImage(thumb, record.imageUrl, (record.name_of_centre || "?").charAt(0));
        thumb.setAttribute("aria-hidden", "true");

        const info = document.createElement("span");
        info.className = "hawker-info";

        const name = document.createElement("span");
        name.className = "hawker-name";
        name.textContent = record.name_of_centre || "Unknown centre";

        const metaLine = document.createElement("span");
        metaLine.className = "hawker-meta-line";

        const star = document.createElement("span");
        star.className = "hawker-star";
        star.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9L12 3.2z"></path></svg>';

        const ratingValue = getHawkerRating(record).toFixed(1);
        const area = record.area || toAreaFromLocation(record.location_of_centre) || "Location";
        const hours = record.hours || getHawkerHours(record);
        const metaText = document.createElement("span");
        metaText.textContent = `${ratingValue} | ${area} | ${hours}`;

        metaLine.append(star, metaText);

        info.append(name, metaLine);
        
        const heart = document.createElement("button");
        heart.className = "fav-heart";
        heart.type = "button";
        heart.setAttribute("aria-label", "Toggle favorite hawker");

        
        heart.textContent = isFavorite("hawker", record._id) ? "\u2764" : "\u2661";

        heart.addEventListener("click", (e) => {
        e.stopImmediatePropagation(); 

        const itemData = {
            id: record._id,
            name: record.name_of_centre || "Unknown centre",
            sub: `${area}`,
            imageUrl: record.imageUrl || ""
        };

        const nowFav = toggleFavorite("hawker", itemData);
        heart.textContent = nowFav ? "\u2764" : "\u2661";
        });

        button.append(thumb, info, heart);

        item.appendChild(button);
        return item;
    };

    const clearSelection = () => {
        const buttons = listEl.querySelectorAll(".hawker-card");
        buttons.forEach((button) => {
            button.classList.remove("is-selected");
            button.setAttribute("aria-pressed", "false");
        });
    };

    const clearStallSelection = () => {
        if (!stallListEl) {
            return;
        }
        const buttons = stallListEl.querySelectorAll(".stall-card");
        buttons.forEach((button) => {
            button.classList.remove("is-selected");
            button.setAttribute("aria-pressed", "false");
        });
    };

    const clearStoredStallSelection = () => {
        hasStallSelection = false;
        currentStallName = "";
        localStorage.removeItem("selectedStallId");
        localStorage.removeItem("selectedStallName");
    };

    const setCurrentHawker = (record) => {
        const nextId = String(record._id);
        const changed = currentHawkerId && currentHawkerId !== nextId;
        currentHawkerId = nextId;
        currentHawkerSource = record && record.source === "firebase" ? "firebase" : "api";
        if (changed) {
            clearStoredStallSelection();
            clearStallSelection();
            resetStallFilters();
            if (stallSearchInput) {
                stallSearchInput.value = "";
                updateStallClearButton();
            }
            exitMenuMode();
        }
    };

    const applySelection = (record) => {
        clearSelection();
        const selectedButton = listEl.querySelector(`[data-centre-id="${record._id}"]`);
        if (selectedButton) {
            selectedButton.classList.add("is-selected");
            selectedButton.setAttribute("aria-pressed", "true");
        }
        hasSelection = true;
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                id: record._id,
                name: record.name_of_centre,
                location: record.location_of_centre
            })
        );
        setStatus(`Selected: ${record.name_of_centre}`);
        setCurrentHawker(record);
        if (hasStallUi) {
            showStallSection(record.name_of_centre);
        }
    };

    const restoreSelection = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return;
        }
        try {
            const record = JSON.parse(stored);
            if (record && record.id) {
                currentHawkerId = String(record.id);
                updateCurrentHawkerSource();
                if (hasStallUi && autoShowStalls) {
                    showStallSection(record.name);
                }
            }
            const selectedButton = listEl.querySelector(`[data-centre-id="${record.id}"]`);
            if (selectedButton) {
                selectedButton.classList.add("is-selected");
                selectedButton.setAttribute("aria-pressed", "true");
                hasSelection = true;
                setStatus(`Selected: ${record.name}`);
            }
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const handleListClick = (event) => {
        const button = event.target.closest(".hawker-card");
        if (!button) {
            return;
        }
        const record = recordsCache.find((item) => String(item._id) === button.dataset.centreId);
        if (!record) {
            return;
        }
        applySelection(record);
    };

    const attachSelectionHandler = () => {
        if (handlerAttached) {
            return;
        }
        listEl.addEventListener("click", handleListClick);
        handlerAttached = true;
    };

    const updateStatusForResults = (records) => {
        if (records.length === 0) {
            setStatus("No matching hawker centres.");
            return;
        }
        if (!hasSelection) {
            setStatus("Select a hawker centre.");
        }
    };

    const applyFilters = () => {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const customHawkers = recordsCache.filter((record) => record.source === "firebase");
        const apiHawkers = recordsCache.filter((record) => record.source !== "firebase");

        const filterGroup = (group) => {
            let filtered = group.slice();

            if (query) {
                filtered = filtered.filter((record) => {
                const name = (record.name_of_centre || "").toLowerCase();
                const location = (record.location_of_centre || "").toLowerCase();
                const area = (record.area || "").toLowerCase();
                return name.includes(query) || location.includes(query) || area.includes(query);
            });
        }

            if (filters.government) {
                filtered = filtered.filter((record) => (record.owner || "").toLowerCase() === "government");
            }

            const typeFilters = [];
            if (filters.typeHc) {
                typeFilters.push("HC");
            }
            if (filters.typeMhc) {
                typeFilters.push("MHC");
            }
            if (typeFilters.length > 0) {
                filtered = filtered.filter((record) => typeFilters.includes(record.type_of_centre));
            }

            if (filters.large) {
                filtered = filtered.filter((record) => getCount(record.no_of_stalls) >= 100);
            }

            if (filters.market) {
                filtered = filtered.filter((record) => getCount(record.no_of_mkt_produce_stalls) > 0);
            }

            if (filters.popular) {
                filtered.sort((a, b) => getCount(b.no_of_stalls) - getCount(a.no_of_stalls));
            }

            return filtered;
        };

        const filtered = [...filterGroup(customHawkers), ...filterGroup(apiHawkers)];
        updateCurrentHawkerSource();

        renderRecords(filtered);
        restoreSelection();
        updateStatusForResults(filtered);
    };

    const attachFilterControls = () => {
        if (controlsAttached) {
            return;
        }

        if (searchInput) {
            searchInput.addEventListener("input", () => {
                updateClearButton();
                applyFilters();
            });
        }

        if (clearButton && searchInput) {
            clearButton.addEventListener("click", () => {
                searchInput.value = "";
                updateClearButton();
                applyFilters();
                searchInput.focus();
            });
        }

        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const filterName = button.dataset.filter;
                if (!filterName) {
                    return;
                }
                const filterKey = toFilterKey(filterName);
                if (!(filterKey in filters)) {
                    return;
                }
                const isActive = button.classList.toggle("is-active");
                filters[filterKey] = isActive;
                applyFilters();
            });
        });

        controlsAttached = true;
        updateClearButton();
    };

    const renderRecords = (records) => {
        listEl.innerHTML = "";
        const fragment = document.createDocumentFragment();
        records.forEach((record) => {
            fragment.appendChild(buildCard(record));
        });
        listEl.appendChild(fragment);
    };

    const toStallName = (title) => {
        const words = (title || "Stall")
            .split(" ")
            .filter(Boolean)
            .slice(0, 4)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
        return `${words.join(" ")} Stall`;
    };

    const stallCategories = [
        "Chicken Rice",
        "Noodles",
        "Mixed Rice",
        "Snacks",
        "Desserts",
        "Drinks",
        "Seafood",
        "Vegetarian",
        "Bakery"
    ];
    const stallGrades = ["A", "B", "C"];
    const stallHours = ["10am-8pm", "9am-6pm", "11am-9pm", "8am-5pm"];

    const menuTemplates = {
        "Chicken Rice": [
            { name: "Roast Chicken Rice", desc: "Signature roast chicken with rice.", basePrice: 4.5 },
            { name: "Steamed Chicken Rice", desc: "Classic steamed chicken set.", basePrice: 4.2 },
            { name: "Chicken Noodle Soup", desc: "Comforting clear broth noodles.", basePrice: 4.8 },
            { name: "Braised Egg Add-on", desc: "Add a braised egg.", basePrice: 1.2 },
            { name: "Iced Barley", desc: "Refreshing house drink.", basePrice: 1.5 }
        ],
        Noodles: [
            { name: "Signature Noodles", desc: "Springy noodles with sauce.", basePrice: 4.0 },
            { name: "Fishball Noodles", desc: "Fishball mix with chili.", basePrice: 4.5 },
            { name: "Laksa", desc: "Spicy coconut broth noodles.", basePrice: 5.2 },
            { name: "Dry Dumpling Noodles", desc: "Dumplings with chili oil.", basePrice: 4.8 },
            { name: "Hot Tea", desc: "Traditional kopi o kosong.", basePrice: 1.3 }
        ],
        "Mixed Rice": [
            { name: "2 Veg 1 Meat Set", desc: "Balanced mixed rice set.", basePrice: 4.5 },
            { name: "3 Veg 1 Meat Set", desc: "Hearty mixed rice set.", basePrice: 5.2 },
            { name: "Add Sambal Fish", desc: "Spicy sambal fish add-on.", basePrice: 2.5 },
            { name: "Tofu & Veg", desc: "Light vegetarian option.", basePrice: 4.0 },
            { name: "Iced Lemon Tea", desc: "Cooling citrus drink.", basePrice: 1.6 }
        ],
        Snacks: [
            { name: "Crispy Spring Rolls", desc: "Golden fried snack.", basePrice: 3.2 },
            { name: "Fried Wanton", desc: "Crunchy wanton bites.", basePrice: 3.0 },
            { name: "Prawn Fritters", desc: "Crispy prawn fritters.", basePrice: 3.8 },
            { name: "Popcorn Chicken", desc: "Spiced chicken bites.", basePrice: 4.2 },
            { name: "Iced Soy", desc: "Classic soy drink.", basePrice: 1.4 }
        ],
        Desserts: [
            { name: "Chendol", desc: "Coconut milk with gula melaka.", basePrice: 3.2 },
            { name: "Ice Kachang", desc: "Shaved ice with toppings.", basePrice: 3.5 },
            { name: "Mango Pudding", desc: "Silky mango dessert.", basePrice: 3.8 },
            { name: "Grass Jelly", desc: "Herbal jelly with syrup.", basePrice: 2.8 },
            { name: "Iced Milo", desc: "Chocolate malt drink.", basePrice: 2.0 }
        ],
        Drinks: [
            { name: "House Kopi", desc: "Bold local coffee.", basePrice: 1.6 },
            { name: "Teh Tarik", desc: "Pulled milk tea.", basePrice: 1.8 },
            { name: "Fresh Lime Juice", desc: "Zesty lime drink.", basePrice: 2.2 },
            { name: "Iced Matcha", desc: "Creamy matcha latte.", basePrice: 3.2 },
            { name: "Mineral Water", desc: "Bottled water.", basePrice: 1.2 }
        ],
        Seafood: [
            { name: "Grilled Sambal Stingray", desc: "Spicy grilled stingray.", basePrice: 6.5 },
            { name: "Prawn Mee", desc: "Prawn broth noodles.", basePrice: 5.5 },
            { name: "Fish Soup", desc: "Light fish soup.", basePrice: 5.0 },
            { name: "Fried Squid", desc: "Crispy fried squid.", basePrice: 5.8 },
            { name: "Calamansi Juice", desc: "Citrus refreshment.", basePrice: 1.9 }
        ],
        Vegetarian: [
            { name: "Veggie Bee Hoon", desc: "Stir-fried rice vermicelli.", basePrice: 3.8 },
            { name: "Tofu Salad", desc: "Fresh tofu salad bowl.", basePrice: 4.2 },
            { name: "Mixed Veg Soup", desc: "Comforting veggie soup.", basePrice: 4.0 },
            { name: "Mushroom Rice", desc: "Fragrant mushroom rice.", basePrice: 4.3 },
            { name: "Soy Milk", desc: "Silky soy drink.", basePrice: 1.4 }
        ],
        Bakery: [
            { name: "Butter Bun", desc: "Soft bakery bun.", basePrice: 1.6 },
            { name: "Curry Puff", desc: "Spiced potato puff.", basePrice: 1.8 },
            { name: "Egg Tart", desc: "Classic egg tart.", basePrice: 2.0 },
            { name: "Kaya Toast Set", desc: "Toast with kaya and butter.", basePrice: 3.5 },
            { name: "Iced Kopi", desc: "Iced coffee.", basePrice: 1.9 }
        ],
        default: [
            { name: "Signature Dish", desc: "House specialty item.", basePrice: 4.5 },
            { name: "Chef Special", desc: "Popular customer favorite.", basePrice: 5.0 },
            { name: "Side Add-on", desc: "Extra side item.", basePrice: 1.5 },
            { name: "Light Bite", desc: "Small snack portion.", basePrice: 3.2 },
            { name: "House Drink", desc: "Refreshing drink.", basePrice: 1.4 }
        ]
    };

    const roundPrice = (value) => Math.round(value * 100) / 100;

    const toPriceNumber = (value) => {
        if (typeof value === "string") {
            const cleaned = value.replace(/[^0-9.]/g, "");
            return Number.parseFloat(cleaned);
        }
        return Number(value);
    };

    const formatPrice = (value) => {
        if (window.GuestCart && typeof window.GuestCart.formatCurrency === "function") {
            return window.GuestCart.formatCurrency(value);
        }
        const safeValue = Number.isFinite(value) ? value : 0;
        return `$${safeValue.toFixed(2)}`;
    };

    const normalizeMenuItems = (items, stallId) => {
        if (!Array.isArray(items)) {
            return [];
        }
        return items
            .map((item, index) => {
                if (!item) {
                    return null;
                }
                const name = String(item.name || item.title || "").trim();
                const desc = String(item.desc || item.description || "").trim();
                const priceValue = toPriceNumber(item.price);
                const imageUrl = item.imageUrl || item.image || item.img || item.photo || "";
                if (!name || !Number.isFinite(priceValue)) {
                    return null;
                }
                return {
                    id: item.id ? String(item.id) : `${stallId}-custom-${index}`,
                    name,
                    desc,
                    price: roundPrice(priceValue),
                    imageUrl
                };
            })
            .filter(Boolean);
    };

    const buildMenuItems = (stall) => {
        if (!stall) {
            return [];
        }
        if (stall.source === "firebase") {
            return normalizeMenuItems(
                stall.menuItems || stall.menu || stall.items,
                stall.id
            );
        }
        const templates = menuTemplates[stall.category] || menuTemplates.default;
        const seed = Number.parseInt(stall.id, 10) || 1;
        return templates.map((item, index) => {
            const priceBump = ((seed + index) % 3) * 0.4;
            return {
                id: `${stall.id}-${index}`,
                name: item.name,
                desc: item.desc,
                price: roundPrice(item.basePrice + priceBump)
            };
        });
    };

    const fetchFirebaseMenuItemsForStall = async (stallId) => {
        const stallKey = String(stallId || "").trim();
        if (!db || !stallKey) {
            return [];
        }
        if (firebaseMenuCache.has(stallKey)) {
            return firebaseMenuCache.get(stallKey);
        }
        if (firebaseMenuInFlight.has(stallKey)) {
            return firebaseMenuInFlight.get(stallKey);
        }

        const task = (async () => {
            try {
                const snap = await getDocs(collection(db, "stalls", stallKey, "menu_items"));
                const items = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
                const normalized = normalizeMenuItems(items, stallKey);
                firebaseMenuCache.set(stallKey, normalized);
                return normalized;
            } finally {
                firebaseMenuInFlight.delete(stallKey);
            }
        })();

        firebaseMenuInFlight.set(stallKey, task);
        return task;
    };

    const showToast = (message) => {
        if (!cartToastEl) {
            return;
        }
        cartToastEl.textContent = message;
        cartToastEl.classList.add("is-visible");
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        toastTimeout = window.setTimeout(() => {
            cartToastEl.classList.remove("is-visible");
        }, 2000);
    };

    const setModalImage = (imageUrl, fallbackText) => {
        if (!menuModalImgEl) {
            return;
        }
        const candidates = getImageCandidates(imageUrl);
        const fallback = "../image/placeholder.svg";
        let index = 0;

        const tryNext = () => {
            if (index >= candidates.length) {
                menuModalImgEl.src = fallback;
                menuModalImgEl.alt = fallbackText;
                return;
            }
            menuModalImgEl.src = candidates[index];
            menuModalImgEl.alt = fallbackText;
            index += 1;
        };

        menuModalImgEl.onerror = tryNext;
        if (candidates.length > 0) {
            tryNext();
        } else {
            menuModalImgEl.src = fallback;
            menuModalImgEl.alt = fallbackText;
        }
    };

    const updateModalQty = (nextQty) => {
        modalQty = Math.max(1, nextQty);
        if (menuModalQtyEl) {
            menuModalQtyEl.textContent = String(modalQty);
        }
        if (menuModalPriceEl && modalItem) {
            const total = modalItem.price * modalQty;
            menuModalPriceEl.textContent = formatPrice(total);
        }
    };

    const openMenuModal = (item) => {
        if (!menuModalEl || !item) {
            return;
        }
        modalItem = item;
        modalQty = 1;
        if (menuModalNameEl) menuModalNameEl.textContent = item.name || "Menu item";
        if (menuModalStallEl) menuModalStallEl.textContent = item.stallName || "";
        if (menuModalRatingEl) menuModalRatingEl.textContent = item.rating || "4.7";
        if (menuModalTimeEl) menuModalTimeEl.textContent = item.time || "20 min";
        if (menuModalDescEl) menuModalDescEl.textContent = item.desc || "A tasty menu item from this stall.";
        setModalImage(item.imageUrl, item.name || "Menu item");
        updateModalQty(1);
        menuModalEl.classList.remove("is-hidden");
        menuModalEl.setAttribute("aria-hidden", "false");
        document.body.classList.add("has-menu-modal");
    };

    const closeMenuModal = () => {
        if (!menuModalEl) {
            return;
        }
        menuModalEl.classList.add("is-hidden");
        menuModalEl.setAttribute("aria-hidden", "true");
        document.body.classList.remove("has-menu-modal");
        modalItem = null;
        modalQty = 1;
    };

    const renderMenu = async (stall) => {
        if (!hasMenuUi || !stall) {
            return;
        }
        const token = ++menuRenderToken;
        const stallId = String(stall.id);
        const stallName = stall.displayName || toStallName(stall.title);
        currentStallName = stallName;
        menuListEl.innerHTML = "";
        let items = [];

        if (stall.source === "firebase") {
            setMenuStatus("Loading menu...");
            try {
                items = await fetchFirebaseMenuItemsForStall(stallId);
            } catch (error) {
                if (token !== menuRenderToken) {
                    return;
                }
                console.error("Failed to load menu items:", error);
                setMenuStatus("Error loading menu. Please try again.");
                return;
            }

            if (token !== menuRenderToken) {
                return;
            }

            if (items.length === 0) {
                const fallback = normalizeMenuItems(
                    stall.menuItems || stall.menu || stall.items,
                    stallId
                );
                if (fallback.length > 0) {
                    items = fallback;
                }
            }
        } else {
            items = buildMenuItems(stall);
        }

        if (token !== menuRenderToken) {
            return;
        }

        if (items.length === 0) {
            setMenuStatus(`No menu available for ${stallName}.`);
            return;
        }
        const fragment = document.createDocumentFragment();

        items.forEach((item) => {
            const card = document.createElement("article");
            card.className = "menu-card";
            card.dataset.itemId = String(item.id);
            card.dataset.itemName = item.name || "";
            card.dataset.itemDesc = item.desc || "";
            card.dataset.itemPrice = String(item.price);
            card.dataset.itemImage = item.imageUrl || "";
            const hawkerName = stall.hawkerName || currentHawkerName;
            const hawkerId = stall.hawkerId || currentHawkerId;
            card.dataset.stallName = stallName;
            card.dataset.stallId = String(stall.id);
            card.dataset.stallRating = String(stall.rating || "4.7");
            card.dataset.itemTime = "20 min";
            card.dataset.hawkerName = hawkerName || "";
            card.dataset.hawkerId = hawkerId ? String(hawkerId) : "";

            const thumb = document.createElement("span");
            thumb.className = "menu-item-thumb";
            applyThumbImage(thumb, item.imageUrl, (item.name || "?").charAt(0));
            thumb.setAttribute("aria-hidden", "true");

            const body = document.createElement("div");
            body.className = "menu-card-body";

            const name = document.createElement("h3");
            name.className = "menu-item-name";
            name.textContent = item.name;

            const desc = document.createElement("p");
            desc.className = "menu-item-desc";
            desc.textContent = item.desc;

            const price = document.createElement("div");
            price.className = "menu-item-price";
            price.textContent = formatPrice(item.price);

            
            const likeBtn = document.createElement("button");
            likeBtn.type = "button";
            likeBtn.className = "like-btn";
            likeBtn.dataset.action = "toggle-favorite";
            likeBtn.dataset.favType = "dish";
            likeBtn.dataset.itemId = item.id;
            likeBtn.setAttribute("aria-label", `Add ${item.name} to favorites`);
            likeBtn.textContent = "\u2661";

            
            const isFav = isFavorite("dish", item.id);
            if (isFav) {
                likeBtn.classList.add("is-on");
                likeBtn.textContent = "\u2665";
            }

            const addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.className = "menu-add";
            addBtn.dataset.action = "add-to-cart";
            addBtn.dataset.itemId = item.id;
            addBtn.dataset.itemName = item.name;
            addBtn.dataset.price = String(item.price);
            addBtn.dataset.stallId = String(stall.id);
            addBtn.dataset.stallName = stallName;
            addBtn.dataset.hawkerId = hawkerId ? String(hawkerId) : "";
            addBtn.dataset.hawkerName = hawkerName || "";
            addBtn.dataset.itemImage = item.imageUrl || "";
            addBtn.setAttribute("aria-label", `Add ${item.name} to cart`);
            addBtn.textContent = "+";

            
            const btnContainer = document.createElement("div");
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "8px";
            btnContainer.style.alignItems = "center";
            btnContainer.append(likeBtn, addBtn);

            const meta = document.createElement("div");
            meta.className = "menu-card-meta";
            meta.append(price, btnContainer);

            body.append(name, desc, meta);
            card.append(thumb, body);
            fragment.appendChild(card);
        });

        menuListEl.appendChild(fragment);
        setMenuStatus("");
    };

    const handleMenuClick = (event) => {
    
    const likeBtn = event.target.closest("[data-action=\"toggle-favorite\"]");
    if (likeBtn) {
        event.stopPropagation(); 
        
        const card = likeBtn.closest(".menu-card");
        if (!card) return;
        
        const favItem = {
            id: card.dataset.itemId,
            name: card.dataset.itemName,
            sub: `${card.dataset.stallName} \u2022 ${formatPrice(Number.parseFloat(card.dataset.itemPrice))}`,
            imageUrl: card.dataset.itemImage || ""
        };
        
        const isNowFav = toggleFavorite("dish", favItem);
        
        if (isNowFav) {
            likeBtn.classList.add("is-on");
            likeBtn.textContent = "\u2665";
            likeBtn.setAttribute("aria-label", `Remove ${favItem.name} from favorites`);
        } else {
            likeBtn.classList.remove("is-on");
            likeBtn.textContent = "\u2661";
            likeBtn.setAttribute("aria-label", `Add ${favItem.name} to favorites`);
        }
        
        return;
    }
    
    const button = event.target.closest("[data-action=\"add-to-cart\"]");
    if (!button || !window.GuestCart) {
        return;
        }
        const item = {
            stallId: button.dataset.stallId,
            stallName: button.dataset.stallName,
            hawkerId: button.dataset.hawkerId || "",
            hawkerName: button.dataset.hawkerName || "",
            itemId: button.dataset.itemId,
            name: button.dataset.itemName,
            imageUrl: button.dataset.itemImage || "",
            price: Number.parseFloat(button.dataset.price),
            qty: 1
        };
        const cart = window.GuestCart.addItem(item);
        const itemCount = cart.items.reduce((sum, entry) => sum + entry.qty, 0);
        showToast(`${item.name} added. Cart now has ${itemCount} item(s).`);
    };

    const handleMenuCardClick = (event) => {
        if (
            event.target.closest("[data-action=\"add-to-cart\"]") ||
            event.target.closest("[data-action=\"toggle-favorite\"]")
        ) {
            return;
        }
        const card = event.target.closest(".menu-card");
        if (!card) {
            return;
        }
        const priceValue = Number.parseFloat(card.dataset.itemPrice);
        const item = {
            id: card.dataset.itemId,
            name: card.dataset.itemName,
            desc: card.dataset.itemDesc,
            price: Number.isFinite(priceValue) ? priceValue : 0,
            imageUrl: card.dataset.itemImage,
            stallId: card.dataset.stallId,
            stallName: card.dataset.stallName,
            hawkerId: card.dataset.hawkerId,
            hawkerName: card.dataset.hawkerName,
            rating: card.dataset.stallRating,
            time: card.dataset.itemTime
        };
        openMenuModal(item);
    };

    const attachMenuHandler = () => {
        if (!hasMenuUi || menuHandlerAttached) {
            return;
        }
        menuListEl.addEventListener("click", handleMenuClick);
        menuListEl.addEventListener("click", handleMenuCardClick);
        if (menuModalBackBtn) {
            menuModalBackBtn.addEventListener("click", closeMenuModal);
        }
        if (menuModalEl) {
            menuModalEl.addEventListener("click", (event) => {
                if (event.target === menuModalEl) {
                    closeMenuModal();
                }
            });
        }
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && menuModalEl && !menuModalEl.classList.contains("is-hidden")) {
                closeMenuModal();
            }
        });
        if (menuModalEl) {
            menuModalEl.addEventListener("click", (event) => {
                const qtyButton = event.target.closest("[data-qty]");
                if (!qtyButton || !modalItem) {
                    return;
                }
                if (qtyButton.dataset.qty === "plus") {
                    updateModalQty(modalQty + 1);
                } else {
                    updateModalQty(modalQty - 1);
                }
            });
        }
        if (menuModalAddBtn) {
            menuModalAddBtn.addEventListener("click", () => {
                if (!modalItem || !window.GuestCart) {
                    return;
                }
                const cart = window.GuestCart.addItem({
                    stallId: modalItem.stallId,
                    stallName: modalItem.stallName,
                    hawkerId: modalItem.hawkerId || "",
                    hawkerName: modalItem.hawkerName || "",
                    itemId: modalItem.id,
                    name: modalItem.name,
                    imageUrl: modalItem.imageUrl || "",
                    price: modalItem.price,
                    qty: modalQty
                });
                const itemCount = cart.items.reduce((sum, entry) => sum + entry.qty, 0);
                showToast(`${modalItem.name} added. Cart now has ${itemCount} item(s).`);
                closeMenuModal();
            });
        }
        menuHandlerAttached = true;
    };

    const enrichStall = (stall) => {
        const id = Number.parseInt(stall.id, 10) || 0;
        const displayName = toStallName(stall.title);
        const rating = Number((4 + (id % 10) / 10).toFixed(1));
        const grade = stallGrades[id % stallGrades.length];
        const isOpen = id % 3 !== 0;
        const hours = isOpen ? stallHours[id % stallHours.length] : "Closed";
        const category = stallCategories[id % stallCategories.length];
        const unit = `#01-${String((id % 40) + 1).padStart(2, "0")}`;

        return {
            ...stall,
            id,
            displayName,
            rating,
            grade,
            isOpen,
            hours,
            category,
            unit
        };
    };

    const mapFirebaseHawker = (docSnap) => {
        const data = docSnap.data() || {};
        const rating = Number(data.rating);
        return {
            _id: docSnap.id,
            name_of_centre: data.name || "Hawker Centre",
            location_of_centre: data.location || data.area || "Location unavailable",
            type_of_centre: data.type || "HC",
            owner: data.owner || "Unknown",
            no_of_stalls: Number.isFinite(data.no_of_stalls) ? data.no_of_stalls : 0,
            no_of_cooked_food_stalls: Number.isFinite(data.no_of_cooked_food_stalls)
                ? data.no_of_cooked_food_stalls
                : 0,
            no_of_mkt_produce_stalls: Number.isFinite(data.no_of_mkt_produce_stalls)
                ? data.no_of_mkt_produce_stalls
                : 0,
            imageUrl: data.imageUrl || data.image || "",
            rating: Number.isFinite(rating) ? rating : null,
            area: data.area || "",
            hours: data.hours || "",
            source: "firebase"
        };
    };

    const mapFirebaseStall = (docSnap) => {
        const data = docSnap.data() || {};
        const rating = Number.isFinite(data.rating) ? data.rating : 4.0;
        const hours = data.hours || "";
        const rawMenuItems = data.menuItems || data.menu || data.items;
        const menuItems = Array.isArray(rawMenuItems) ? rawMenuItems : [];
        const stallName = data.stallName || data.name || "Stall";
        return {
            id: docSnap.id,
            title: stallName,
            body: data.location || "",
            displayName: stallName,
            rating,
            grade: data.grade || "",
            isOpen: Boolean(hours),
            hours,
            category: data.category || "Stall",
            unit: data.location || "",
            location: data.location || "",
            hawkerId: data.hawkerId || "",
            hawkerName: data.hawkerName || "",
            imageUrl: data.imageUrl || data.image || "",
            menuItems,
            source: "firebase"
        };
    };

    const fetchFirebaseHawkers = async () => {
        if (!db) {
            return [];
        }
        try {
            const snap = await getDocs(collection(db, "hawkers"));
            return snap.docs.map(mapFirebaseHawker);
        } catch (error) {
            console.warn("Failed to load hawkers from Firebase:", error);
            return [];
        }
    };

    const fetchFirebaseStalls = async () => {
        if (!db) {
            return [];
        }
        try {
            const snap = await getDocs(collection(db, "stalls"));
            return snap.docs.map(mapFirebaseStall);
        } catch (error) {
            console.warn("Failed to load stalls from Firebase:", error);
            return [];
        }
    };

    const buildStallCard = (stall) => {
        const item = document.createElement("li");
        item.className = "stall-item";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "stall-card";
        button.setAttribute("aria-pressed", "false");
        button.dataset.stallId = String(stall.id);

        const thumb = document.createElement("span");
        thumb.className = "stall-thumb";
        applyThumbImage(thumb, stall.imageUrl, (stall.displayName || stall.title || "?").charAt(0));
        thumb.setAttribute("aria-hidden", "true");

        const info = document.createElement("span");
        info.className = "stall-info";

        const stallName = stall.displayName || toStallName(stall.title);
        const ratingLabel = Number.isFinite(stall.rating) ? stall.rating.toFixed(1) : "4.0";
        const category = stall.category || "Stall";
        const unit = stall.unit || "#01-01";
        const isCustom = stall.source === "firebase";
        const metaParts = isCustom
            ? [`Rating ${ratingLabel}`, stall.location || unit]
            : [`Rating ${ratingLabel}`, category, unit];
        const statusParts = [];
        if (isCustom) {
            statusParts.push(stall.hours ? `Hours ${stall.hours}` : "Hours unavailable");
        } else {
            statusParts.push(stall.isOpen ? "Open" : "Closed");
            if (stall.isOpen && stall.hours) {
                statusParts.push(stall.hours);
            }
            if (stall.grade) {
                statusParts.push(`Grade ${stall.grade}`);
            }
        }

        const title = document.createElement("h3");
        title.className = "stall-name";
        title.textContent = stallName;

        const meta = document.createElement("span");
        meta.className = "stall-meta";
        meta.textContent = metaParts.join(" | ");

        const desc = document.createElement("p");
        desc.className = "stall-desc";
        desc.textContent = statusParts.join(" | ");

        info.append(title, meta, desc);
        const heart = document.createElement("button");
        heart.className = "fav-heart";
        heart.type = "button";

        heart.textContent = isFavorite("stall", stall.id) ? "\u2764" : "\u2661";

        heart.addEventListener("click", (e) => {
        e.stopImmediatePropagation();

        const item = {
            id: stall.id,
            name: stallName,
            sub: stall.hawkerName || currentHawkerName || "",
            imageUrl: stall.imageUrl || ""
        };

        const nowFav = toggleFavorite("stall", item);
        heart.textContent = nowFav ? "\u2764" : "\u2661";
        });

        button.append(thumb, info, heart);

        item.appendChild(button);
        return item;
    };

    const applyStallSelection = (stall) => {
        if (!stallListEl) {
            return;
        }
        clearStallSelection();
        const stallName = stall.displayName || toStallName(stall.title);
        if (stall.source === "firebase") {
            firebaseMenuCache.delete(String(stall.id));
        }
        const selectedButton = stallListEl.querySelector(`[data-stall-id="${stall.id}"]`);
        if (selectedButton) {
            selectedButton.classList.add("is-selected");
            selectedButton.setAttribute("aria-pressed", "true");
        }
        hasStallSelection = true;
        localStorage.setItem("selectedStallId", String(stall.id));
        localStorage.setItem("selectedStallName", stallName);
        setStallStatus(`Selected: ${stallName}`);
        enterMenuMode();
        renderMenu(stall);
    };

    const restoreStallSelection = () => {
        if (!stallListEl) {
            return;
        }
        const storedId = localStorage.getItem("selectedStallId");
        if (!storedId) {
            hasStallSelection = false;
            exitMenuMode();
            return;
        }
        const selectedButton = stallListEl.querySelector(`[data-stall-id="${storedId}"]`);
        if (selectedButton) {
            selectedButton.classList.add("is-selected");
            selectedButton.setAttribute("aria-pressed", "true");
            hasStallSelection = true;
            const storedName = localStorage.getItem("selectedStallName");
            if (storedName) {
                setStallStatus(`Selected: ${storedName}`);
                currentStallName = storedName;
            }
            const stall = stallsCache.find((item) => String(item.id) === String(storedId));
            if (stall) {
                currentStallName = currentStallName || stall.displayName || toStallName(stall.title);
                enterMenuMode();
                renderMenu(stall);
            }
        } else {
            hasStallSelection = false;
            exitMenuMode();
        }
    };

    const updateStallStatusForResults = (stalls) => {
        if (!stallStatusEl) {
            return;
        }
        if (stalls.length === 0) {
            setStallStatus("No stalls found.");
            return;
        }
        if (!hasStallSelection) {
            setStallStatus("Select a stall.");
        }
    };

    const renderStalls = (stalls) => {
        if (!stallListEl) {
            return;
        }
        stallListEl.innerHTML = "";
        const fragment = document.createDocumentFragment();
        stalls.forEach((stall) => {
            fragment.appendChild(buildStallCard(stall));
        });
        stallListEl.appendChild(fragment);
    };

    const applyStallFilter = () => {
        if (!hasStallUi) {
            return;
        }
        const customStalls = stallsCache.filter((stall) => stall.source === "firebase");
        const apiStalls = stallsCache.filter((stall) => stall.source !== "firebase");
        const query = stallSearchInput.value.trim().toLowerCase();
        const filterGroup = (group) => {
            let filtered = group.slice();
            if (query) {
                filtered = filtered.filter((stall) => {
                    const displayName = (stall.displayName || "").toLowerCase();
                    const title = (stall.title || "").toLowerCase();
                    const body = (stall.body || "").toLowerCase();
                    const location = (stall.location || "").toLowerCase();
                    return (
                        displayName.includes(query) ||
                        title.includes(query) ||
                        body.includes(query) ||
                        location.includes(query)
                    );
                });
            }
            if (stallFilters.open) {
                filtered = filtered.filter((stall) => stall.isOpen);
            }
            if (stallFilters.gradeA) {
                filtered = filtered.filter((stall) => stall.grade === "A");
            }
            if (stallFilters.popular) {
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            }
            return filtered;
        };

        let customFiltered = [];
        let apiFiltered = [];

        if (currentHawkerSource === "firebase") {
            customFiltered = customStalls.filter((stall) => stall.hawkerId === currentHawkerId);
            customFiltered = filterGroup(customFiltered);
        } else if (currentHawkerSource === "api") {
            apiFiltered = filterGroup(apiStalls);
        } else {
            customFiltered = filterGroup(customStalls);
            apiFiltered = filterGroup(apiStalls);
        }

        const filtered = [...customFiltered, ...apiFiltered];
        renderStalls(filtered);
        restoreStallSelection();
        updateStallStatusForResults(filtered);
    };

    const handleStallClick = (event) => {
        const button = event.target.closest(".stall-card");
        if (!button) {
            return;
        }
        const stall = stallsCache.find((item) => String(item.id) === button.dataset.stallId);
        if (!stall) {
            return;
        }
        applyStallSelection(stall);
    };

    const attachStallHandler = () => {
        if (!stallListEl || stallHandlerAttached) {
            return;
        }
        stallListEl.addEventListener("click", handleStallClick);
        stallHandlerAttached = true;
    };

    const attachStallControls = () => {
        if (!hasStallUi || stallControlsAttached) {
            return;
        }
        stallSearchInput.addEventListener("input", () => {
            updateStallClearButton();
            applyStallFilter();
        });

        if (stallClearButton) {
            stallClearButton.addEventListener("click", () => {
                stallSearchInput.value = "";
                updateStallClearButton();
                applyStallFilter();
                stallSearchInput.focus();
            });
        }

        stallFilterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const filterName = button.dataset.stallFilter;
                const filterKey = toFilterKey(filterName);
                if (!(filterKey in stallFilters)) {
                    return;
                }
                const isActive = button.classList.toggle("is-active");
                stallFilters[filterKey] = isActive;
                applyStallFilter();
            });
        });

        stallControlsAttached = true;
        updateStallClearButton();
    };

    if (stallBackButton) {
        stallBackButton.addEventListener("click", () => {
            if (isMenuMode) {
                exitMenuMode();
                clearStoredStallSelection();
                clearStallSelection();
                setStallStatus("Select a stall.");
                if (stallSearchInput) {
                    stallSearchInput.focus();
                }
                return;
            }
            clearSelection();
            hasSelection = false;
            localStorage.removeItem(STORAGE_KEY);
            clearStoredStallSelection();
            clearStallSelection();
            showHawkerFlow();
            if (searchInput) {
                searchInput.focus();
            }
        });
    }

    const ensureStallsLoaded = async () => {
        if (!hasStallUi || stallsLoaded || stallsLoading) {
            return;
        }
        stallsLoading = true;
        setStallStatus("Loading stalls...");
        try {
            const [firebaseData, apiData] = await Promise.all([
                fetchFirebaseStalls(),
                fetch(STALLS_URL, { method: "GET" }).then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch stalls");
                    }
                    return response.json();
                })
            ]);
            firebaseStalls = firebaseData;
            const apiStalls = Array.isArray(apiData) ? apiData.map(enrichStall) : [];
            stallsCache = [...firebaseStalls, ...apiStalls];
            stallsLoaded = true;
            attachStallHandler();
            applyStallFilter();
        } catch (error) {
            console.error("Failed to load stalls:", error);
            setStallStatus("Error loading stalls. Please try again.");
        } finally {
            stallsLoading = false;
        }
    };

    const loadHawkers = async () => {
        try {
            setStatus("Loading hawker centres...");
            const [firebaseData, apiResponse] = await Promise.all([
                fetchFirebaseHawkers(),
                fetch(API_URL, { method: "GET" })
            ]);
            if (!apiResponse.ok) {
                throw new Error(`Request failed: ${apiResponse.status}`);
            }
            const data = await apiResponse.json();
            if (!data.success || !data.result || !Array.isArray(data.result.records)) {
                throw new Error("API response missing records.");
            }

            firebaseHawkers = firebaseData;
            const apiHawkers = data.result.records
                .slice()
                .sort((a, b) => (a.name_of_centre || "").localeCompare(b.name_of_centre || ""));
            recordsCache = [...firebaseHawkers, ...apiHawkers];

            if (recordsCache.length === 0) {
                setStatus("No hawker centres available.");
                listEl.innerHTML = "";
                return;
            }

            attachFilterControls();
            attachSelectionHandler();
            applyFilters();
        } catch (error) {
            console.error("Failed to load hawker centres:", error);
            setStatus("Unable to load hawker centres. Please try again later.");
        }
    };

    loadHawkers();
})();
