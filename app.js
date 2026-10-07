// Storage Key
const STORAGE_KEY = "sahu_business_hub_v2";

let appState = {
  products: [] // { id, category, name, cost, sales, liters, profitPerLiter, profit, status, dateAdded, dateSold }
};

let currentCategory = "grocery";
let currentTab = "ACTIVE";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupLiveCalculators();
  updateDashboard();

  // Splash Screen Fade
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    const dashboard = document.getElementById("dashboard");
    if (splash) {
      splash.style.opacity = "0";
      setTimeout(() => {
        splash.classList.add("hidden");
        dashboard.classList.remove("hidden");
      }, 300);
    }
  }, 900);

  // Live Search Filter
  document.getElementById("module-search").addEventListener("input", renderModuleList);
});

// Storage
function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      console.error("Storage error", e);
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  updateDashboard();
}

// Navigation
function openModule(category) {
  currentCategory = category;
  currentTab = "ACTIVE";
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("module-screen").classList.remove("hidden");

  // Title
  const titles = {
    grocery: "Grocery Inventory",
    petrol: "Petrol & Diesel Tracker",
    fertilizer: "Fertilizer Inventory"
  };
  document.getElementById("module-title").textContent = titles[category];

  // Reset tab buttons
  document.getElementById("tab-active").classList.add("active");
  document.getElementById("tab-sold").classList.remove("active");
  document.getElementById("module-search").value = "";

  renderModuleList();
}

function backToDashboard() {
  document.getElementById("module-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  updateDashboard();
}

function switchTab(tab) {
  currentTab = tab;
  if (tab === "ACTIVE") {
    document.getElementById("tab-active").classList.add("active");
    document.getElementById("tab-sold").classList.remove("active");
  } else {
    document.getElementById("tab-sold").classList.add("active");
    document.getElementById("tab-active").classList.remove("active");
  }
  renderModuleList();
}

// Live Math Previews
function setupLiveCalculators() {
  const cost = document.getElementById("form-cost");
  const sales = document.getElementById("form-sales");
  const liters = document.getElementById("form-liters");
  const ppl = document.getElementById("form-profit-per-liter");
  const preview = document.getElementById("form-profit-preview");

  function calc() {
    if (currentCategory === "petrol") {
      const l = parseFloat(liters.value) || 0;
      const p = parseFloat(ppl.value) || 0;
      preview.textContent = `₹ ${Math.round(l * p)}`;
    } else {
      const c = parseFloat(cost.value) || 0;
      const s = parseFloat(sales.value) || 0;
      preview.textContent = `₹ ${Math.round(s - c)}`;
    }
  }

  cost.addEventListener("input", calc);
  sales.addEventListener("input", calc);
  liters.addEventListener("input", calc);
  ppl.addEventListener("input", calc);
}

// Modal Handlers
function openStockModal(presetName = "") {
  const modal = document.getElementById("add-modal");
  const heading = document.getElementById("modal-heading");
  const nameInput = document.getElementById("form-name");
  const pillsContainer = document.getElementById("preset-pills");
  const standardInputs = document.getElementById("mode-standard-inputs");
  const fuelInputs = document.getElementById("mode-fuel-inputs");

  // Reset form
  document.getElementById("stock-form").reset();
  document.getElementById("form-profit-preview").textContent = "₹ 0";

  // Check category mode
  if (currentCategory === "petrol") {
    heading.textContent = presetName ? `Restock ${presetName}` : "New Fuel Entry";
    standardInputs.classList.add("hidden");
    fuelInputs.classList.remove("hidden");

    // Fuel quick buttons
    pillsContainer.innerHTML = `
      <button type="button" class="preset-pill" onclick="selectPreset('Petrol')">Petrol</button>
      <button type="button" class="preset-pill" onclick="selectPreset('Diesel')">Diesel</button>
    `;
    pillsContainer.classList.remove("hidden");
  } else if (currentCategory === "fertilizer") {
    heading.textContent = presetName ? `Restock ${presetName}` : "New Fertilizer Entry";
    fuelInputs.classList.add("hidden");
    standardInputs.classList.remove("hidden");

    // Fertilizer quick buttons
    pillsContainer.innerHTML = `
      <button type="button" class="preset-pill" onclick="selectPreset('Urea')">Urea</button>
      <button type="button" class="preset-pill" onclick="selectPreset('DAP')">DAP</button>
      <button type="button" class="preset-pill" onclick="selectPreset('Potash')">Potash</button>
    `;
    pillsContainer.classList.remove("hidden");
  } else {
    heading.textContent = presetName ? `Restock ${presetName}` : "New Grocery Entry";
    fuelInputs.classList.add("hidden");
    standardInputs.classList.remove("hidden");
    pillsContainer.classList.add("hidden");
  }

  modal.classList.remove("hidden");

  // Autofill if tapping an existing card
  if (presetName) {
    nameInput.value = presetName;
    if (currentCategory === "petrol") {
      document.getElementById("form-liters").focus();
    } else {
      document.getElementById("form-cost").focus();
    }
  } else {
    nameInput.focus();
  }
}

function selectPreset(name) {
  document.getElementById("form-name").value = name;
  if (currentCategory === "petrol") {
    document.getElementById("form-liters").focus();
  } else {
    document.getElementById("form-cost").focus();
  }
}

function closeModal() {
  document.getElementById("add-modal").classList.add("hidden");
}

// Form Submit (Save / Auto-Rollover)
function handleFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("form-name").value.trim();
  if (!name) return;

  let profit = 0;
  let cost = 0;
  let sales = 0;
  let liters = 0;
  let profitPerLiter = 0;

  if (currentCategory === "petrol") {
    liters = parseFloat(document.getElementById("form-liters").value) || 0;
    profitPerLiter = parseFloat(document.getElementById("form-profit-per-liter").value) || 0;
    profit = Math.round(liters * profitPerLiter);
  } else {
    cost = parseFloat(document.getElementById("form-cost").value) || 0;
    sales = parseFloat(document.getElementById("form-sales").value) || 0;
    profit = Math.round(sales - cost);
  }

  // AUTO-ROLLOVER RULE:
  // If this item already exists in ACTIVE status inside this category, mark the old one as SOLD
  const existingActive = appState.products.find(
    (p) => p.category === currentCategory && p.status === "ACTIVE" && p.name.toLowerCase() === name.toLowerCase()
  );

  if (existingActive) {
    existingActive.status = "SOLD";
    existingActive.dateSold = new Date().toISOString();
  }

  // Add the new active stock entry
  appState.products.unshift({
    id: "item_" + Date.now(),
    category: currentCategory,
    name,
    cost,
    sales,
    liters,
    profitPerLiter,
    profit,
    status: "ACTIVE",
    dateAdded: new Date().toISOString(),
    dateSold: null
  });

  saveData();
  closeModal();
  renderModuleList();
}

// Mark an item sold manually
function markAsSold(id, event) {
  if (event) event.stopPropagation(); // prevent opening edit modal
  const item = appState.products.find((p) => p.id === id);
  if (item) {
    item.status = "SOLD";
    item.dateSold = new Date().toISOString();
    saveData();
    renderModuleList();
  }
}

// Render Items List
function renderModuleList() {
  const container = document.getElementById("module-items-list");
  const query = document.getElementById("module-search").value.toLowerCase().trim();

  // Filter items by category
  const categoryItems = appState.products.filter((p) => p.category === currentCategory);
  const activeItems = categoryItems.filter((p) => p.status === "ACTIVE");
  const soldItems = categoryItems.filter((p) => p.status === "SOLD");

  document.getElementById("count-active").textContent = activeItems.length;
  document.getElementById("count-sold").textContent = soldItems.length;

  let displayItems = currentTab === "ACTIVE" ? activeItems : soldItems;

  if (query) {
    displayItems = displayItems.filter((p) => p.name.toLowerCase().includes(query));
  }

  if (displayItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${query ? "No items matching your search." : currentTab === "ACTIVE" ? "No active stock right now. Tap [+ Add Stock Entry] below." : "No sold out history recorded yet."}
      </div>
    `;
    return;
  }

  container.innerHTML = displayItems
    .map((item) => {
      const isSold = item.status === "SOLD";
      const soldDateFormatted = item.dateSold
        ? new Date(item.dateSold).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : "";

      // Price info display
      let detailsHtml = "";
      if (item.category === "petrol") {
        detailsHtml = `<span>${item.liters}L × <strong>₹${item.profitPerLiter}/L</strong></span>`;
      } else {
        detailsHtml = `<span>Cost: <strong>₹${item.cost}</strong></span> <span>Sales: <strong>₹${item.sales}</strong></span>`;
      }

      // Tapping card triggers restock modal with name pre-filled
      return `
      <div class="stock-card" onclick="openStockModal('${escapeHtml(item.name)}')">
        <div class="stock-card-top">
          <span class="product-title">${item.name}</span>
          <span class="stock-badge-profit">+₹ ${item.profit}</span>
        </div>
        <div class="stock-card-bottom">
          <div class="price-details">${detailsHtml}</div>
          ${
            !isSold
              ? `<button class="sold-btn" onclick="markAsSold('${item.id}', event)">✓ Mark Sold</button>`
              : `<span class="sold-meta">Sold: ${soldDateFormatted}</span>`
          }
        </div>
      </div>
    `;
    })
    .join("");
}

// Utility to escape HTML names
function escapeHtml(text) {
  return text.replace(/'/g, "\\'");
}

// Compute Dashboard Numbers across ALL categories
function updateDashboard() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  let weeklyProfit = 0;
  let monthlyProfit = 0;
  let groceryProfit = 0;
  let petrolProfit = 0;
  let fertilizerProfit = 0;
  let futureProfit = 0;

  appState.products.forEach((p) => {
    if (p.status === "ACTIVE") {
      futureProfit += p.profit;
    } else if (p.status === "SOLD" && p.dateSold) {
      const soldDate = new Date(p.dateSold);

      // Per-category realized totals
      if (p.category === "grocery") groceryProfit += p.profit;
      if (p.category === "petrol") petrolProfit += p.profit;
      if (p.category === "fertilizer") fertilizerProfit += p.profit;

      // Monthly total
      if (soldDate.getMonth() === currentMonth && soldDate.getFullYear() === currentYear) {
        monthlyProfit += p.profit;
      }

      // Weekly total (rolling 7 days)
      if (soldDate >= sevenDaysAgo && soldDate <= now) {
        weeklyProfit += p.profit;
      }
    }
  });

  document.getElementById("weekly-profit").textContent = `₹ ${weeklyProfit}`;
  document.getElementById("monthly-profit").textContent = `₹ ${monthlyProfit}`;
  document.getElementById("grocery-profit").textContent = `₹ ${groceryProfit}`;
  document.getElementById("petrol-profit").textContent = `₹ ${petrolProfit}`;
  document.getElementById("fertilizer-profit").textContent = `₹ ${fertilizerProfit}`;
  document.getElementById("future-profit").textContent = `₹ ${futureProfit}`;
}
