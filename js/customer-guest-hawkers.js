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
    const hasStallUi = Boolean(stallSectionEl && stallListEl && stallStatusEl && stallSearchInput);
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

    if (!listEl || !statusEl) {
        return;
    }

    const setStatus = (message) => {
        statusEl.textContent = message;
    };

    const setStallStatus = (message) => {
        if (stallStatusEl) {
            stallStatusEl.textContent = message;
        }
    };

    const updateStallHeaderName = (hawkerName) => {
        if (!stallHawkerNameEl) {
            return;
        }
        stallHawkerNameEl.textContent = hawkerName || "Hawker Centre";
    };

    const showHawkerFlow = () => {
        if (hawkerFlowEl) {
            hawkerFlowEl.classList.remove("is-hidden");
        }
        if (stallSectionEl) {
            stallSectionEl.classList.add("is-hidden");
        }
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
        autoShowStalls = true;
        updateStallHeaderName(hawkerName);
        attachStallControls();
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
        thumb.textContent = (record.name_of_centre || "?").charAt(0);
        thumb.setAttribute("aria-hidden", "true");

        const info = document.createElement("span");
        info.className = "hawker-info";

        const name = document.createElement("span");
        name.className = "hawker-name";
        name.textContent = record.name_of_centre || "Unknown centre";

        const location = document.createElement("span");
        location.className = "hawker-meta";
        location.textContent = record.location_of_centre || "Location unavailable";

        const details = document.createElement("span");
        details.className = "hawker-meta";
        details.textContent = `${record.type_of_centre || "Unknown"} | ${record.owner || "Unknown"}`;

        const stalls = document.createElement("span");
        stalls.className = "hawker-stalls";
        stalls.textContent = `Stalls: ${getCount(record.no_of_stalls)} total, ${getCount(record.no_of_cooked_food_stalls)} cooked, ${getCount(record.no_of_mkt_produce_stalls)} market`;

        info.append(name, location, details, stalls);
        button.append(thumb, info);
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
        localStorage.removeItem("selectedStallId");
        localStorage.removeItem("selectedStallName");
    };

    const setCurrentHawker = (record) => {
        const nextId = String(record._id);
        const changed = currentHawkerId && currentHawkerId !== nextId;
        currentHawkerId = nextId;
        if (changed) {
            clearStoredStallSelection();
            clearStallSelection();
            resetStallFilters();
            if (stallSearchInput) {
                stallSearchInput.value = "";
                updateStallClearButton();
            }
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
        let filtered = recordsCache.slice();
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

        if (query) {
            filtered = filtered.filter((record) => {
                const name = (record.name_of_centre || "").toLowerCase();
                const location = (record.location_of_centre || "").toLowerCase();
                return name.includes(query) || location.includes(query);
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

    const buildStallCard = (stall) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stall-card";
        button.setAttribute("role", "listitem");
        button.setAttribute("aria-pressed", "false");
        button.dataset.stallId = String(stall.id);

        const thumb = document.createElement("span");
        thumb.className = "stall-thumb";
        thumb.textContent = (stall.title || "?").charAt(0);
        thumb.setAttribute("aria-hidden", "true");

        const info = document.createElement("span");
        info.className = "stall-info";

        const stallName = stall.displayName || toStallName(stall.title);
        const ratingLabel = Number.isFinite(stall.rating) ? stall.rating.toFixed(1) : "4.0";
        const category = stall.category || "Stall";
        const unit = stall.unit || "#01-01";
        const metaParts = [`Rating ${ratingLabel}`, category, unit];
        const statusParts = [stall.isOpen ? "Open" : "Closed"];
        if (stall.isOpen && stall.hours) {
            statusParts.push(stall.hours);
        }
        if (stall.grade) {
            statusParts.push(`Grade ${stall.grade}`);
        }

        const title = document.createElement("h3");
        title.className = "stall-name";
        title.textContent = stallName;

        thumb.textContent = stallName.charAt(0);

        const meta = document.createElement("span");
        meta.className = "stall-meta";
        meta.textContent = metaParts.join(" | ");

        const desc = document.createElement("p");
        desc.className = "stall-desc";
        desc.textContent = statusParts.join(" | ");

        info.append(title, meta, desc);
        button.append(thumb, info);
        return button;
    };

    const applyStallSelection = (stall) => {
        if (!stallListEl) {
            return;
        }
        clearStallSelection();
        const stallName = stall.displayName || toStallName(stall.title);
        const selectedButton = stallListEl.querySelector(`[data-stall-id="${stall.id}"]`);
        if (selectedButton) {
            selectedButton.classList.add("is-selected");
            selectedButton.setAttribute("aria-pressed", "true");
        }
        hasStallSelection = true;
        localStorage.setItem("selectedStallId", String(stall.id));
        localStorage.setItem("selectedStallName", stallName);
        setStallStatus(`Selected: ${stallName}`);
    };

    const restoreStallSelection = () => {
        if (!stallListEl) {
            return;
        }
        const storedId = localStorage.getItem("selectedStallId");
        if (!storedId) {
            hasStallSelection = false;
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
            }
        } else {
            hasStallSelection = false;
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
        let filtered = stallsCache.slice();
        const query = stallSearchInput.value.trim().toLowerCase();
        if (query) {
            filtered = filtered.filter((stall) => {
                const displayName = (stall.displayName || "").toLowerCase();
                const title = (stall.title || "").toLowerCase();
                const body = (stall.body || "").toLowerCase();
                return displayName.includes(query) || title.includes(query) || body.includes(query);
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
            const response = await fetch(STALLS_URL, { method: "GET" });
            if (!response.ok) {
                throw new Error("Failed to fetch stalls");
            }
            const data = await response.json();
            stallsCache = Array.isArray(data) ? data.map(enrichStall) : [];
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
            const response = await fetch(API_URL, { method: "GET" });
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success || !data.result || !Array.isArray(data.result.records)) {
                throw new Error("API response missing records.");
            }

            recordsCache = data.result.records
                .slice()
                .sort((a, b) => (a.name_of_centre || "").localeCompare(b.name_of_centre || ""));

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
