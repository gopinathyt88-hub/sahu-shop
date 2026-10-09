// Storage configuration with automatic backward compatibility
const STORAGE_KEY = "sahu_business_hub_v3";

let appState = {
  batches: [] // { id, category, name, cost, sales, liters, profitPerLiter, profit, status: 'ACTIVE'|'SOLD', dateAdded, dateSold }
};

let currentCategory = "grocery";
let currentCategoryTab = "ACTIVE";
let selectedProductName = "";

// Initialize Application
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

  // Live Search listener
  document.getElementById("module-search").addEventListener("input", renderModuleList);
});

// Load & Save Data
function loadData() {
  let saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    // Check previous storage keys so no test entries are lost
    saved = localStorage.getItem("sahu_business_hub_v2") || localStorage.getItem("sahu_shop_data_v1");
  }
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState.batches = parsed.batches || parsed.products || [];
    } catch (e) {
      console.error("Storage loading error:", e);
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  updateDashboard();
}

// Navigation Handlers
function openModule(category) {
  currentCategory = category;
  currentCategoryTab = "ACTIVE";
  selectedProductName = "";

  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("product-detail-screen").classList.add("hidden");
  document.getElementById("module-screen").classList.remove("hidden");

  const titles = {
    grocery: "Grocery Inventory",
    petrol: "Petrol & Diesel Tracker",
    fertilizer: "Fertilizer Inventory"
  };
  document.getElementById("module-title").textContent = titles[category];

  document.getElementById("tab-active").classList.add("active");
  document.getElementById("tab-sold").classList.remove("active");
  document.getElementById("module-search").value = "";

  renderModuleList();
}

function backToDashboard() {
  document.getElementById("module-screen").classList.add("hidden");
  document.getElementById("product-detail-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  updateDashboard();
}

function switchCategoryTab(tab) {
  currentCategoryTab = tab;
  if (tab === "ACTIVE") {
    document.getElementById("tab-active").classList.add("active");
    document.getElementById("tab-sold").classList.remove("active");
  } else {
    document.getElementById("tab-sold").classList.add("active");
    document.getElementById("tab-active").classList.remove("active");
  }
  renderModuleList();
}

// Open Dedicated Product History Screen
function openProductDetail(productName) {
  selectedProductName = productName;
  document.getElementById("module-screen").classList.add("hidden");
  document.getElementById("product-detail-screen").classList.remove("hidden");
  document.getElementById("detail-product-name").textContent = productName;

  renderProductDetail();
}

function backToModule() {
  document.getElementById("product-detail-screen").classList.add("hidden");
  document.getElementById("module-screen").classList.remove("hidden");
  renderModuleList();
}

// Live Math Calculator for Modal
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

// Modal Handlers (New & Restock)
function openNewStockModal() {
  configureModalUi(null, "");
}

function openRestockCurrentModal() {
  configureModalUi(null, selectedProductName);
}

function openEditBatchModal(batchId, event) {
  if (event) event.stopPropagation();
  const batch = appState.batches.find((b) => b.id === batchId);
  if (!batch) return;
  configureModalUi(batch, batch.name);
}

function configureModalUi(batchToEdit, presetName) {
  const modal = document.getElementById("stock-modal");
  const heading = document.getElementById("modal-heading");
  const submitBtn = document.getElementById("modal-submit-btn");
  const editIdInput = document.getElementById("edit-batch-id");
  const nameInput = document.getElementById("form-name");
  const pillsContainer = document.getElementById("preset-pills");
  const standardInputs = document.getElementById("mode-standard-inputs");
  const fuelInputs = document.getElementById("mode-fuel-inputs");

  document.getElementById("stock-form").reset();
  editIdInput.value = batchToEdit ? batchToEdit.id : "";

  // Set category mode
  if (currentCategory === "petrol") {
    standardInputs.classList.add("hidden");
    fuelInputs.classList.remove("hidden");

    pillsContainer.innerHTML = `
      <button type="button" class="preset-pill" onclick="selectPreset('Petrol')">Petrol</button>
      <button type="button" class="preset-pill" onclick="selectPreset('Diesel')">Diesel</button>
    `;
    pillsContainer.classList.remove("hidden");
  } else if (currentCategory === "fertilizer") {
    fuelInputs.classList.add("hidden");
    standardInputs.classList.remove("hidden");

    pillsContainer.innerHTML = `
      <button type="button" class="preset-pill" onclick="selectPreset('Urea')">Urea</button>
      <button type="button" class="preset-pill" onclick="selectPreset('DAP')">DAP</button>
      <button type="button" class="preset-pill" onclick="selectPreset('Potash')">Potash</button>
    `;
    pillsContainer.classList.remove("hidden");
  } else {
    fuelInputs.classList.add("hidden");
    standardInputs.classList.remove("hidden");
    pillsContainer.classList.add("hidden");
  }

  // Pre-fill fields if Editing
  if (batchToEdit) {
    heading.textContent = `Edit Batch (${batchToEdit.name})`;
    submitBtn.textContent = "Save Changes";
    nameInput.value = batchToEdit.name;

    if (currentCategory === "petrol") {
      document.getElementById("form-liters").value = batchToEdit.liters;
      document.getElementById("form-profit-per-liter").value = batchToEdit.profitPerLiter;
    } else {
      document.getElementById("form-cost").value = batchToEdit.cost;
      document.getElementById("form-sales").value = batchToEdit.sales;
    }
    document.getElementById("form-profit-preview").textContent = `₹ ${batchToEdit.profit}`;
  } else {
    // New Stock
    heading.textContent = presetName ? `Restock: ${presetName}` : "New Stock Entry";
    submitBtn.textContent = "Save to Active Stock";
    nameInput.value = presetName;
    document.getElementById("form-profit-preview").textContent = "₹ 0";
  }

  modal.classList.remove("hidden");

  if (presetName && !batchToEdit) {
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
  document.getElementById("stock-modal").classList.add("hidden");
}

// Form Submission (Add New Batch or Update Existing)
function handleFormSave(e) {
  e.preventDefault();
  const editId = document.getElementById("edit-batch-id").value;
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

  if (editId) {
    // EDIT EXISTING BATCH
    const batch = appState.batches.find((b) => b.id === editId);
    if (batch) {
      batch.name = name;
      batch.cost = cost;
      batch.sales = sales;
      batch.liters = liters;
      batch.profitPerLiter = profitPerLiter;
      batch.profit = profit;
    }
  } else {
    // ADD NEW BATCH (Does NOT overwrite or auto-sell older batches)
    appState.batches.unshift({
      id: "batch_" + Date.now(),
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
  }

  saveData();
  closeModal();

  if (selectedProductName) {
    selectedProductName = name; // Update in case name was edited
    renderProductDetail();
  } else {
    renderModuleList();
  }
}

// Delete Batch Handler
function deleteBatch(batchId, event) {
  if (event) event.stopPropagation();
  if (!confirm("Are you sure you want to delete this batch entry? This cannot be undone.")) {
    return;
  }

  appState.batches = appState.batches.filter((b) => b.id !== batchId);
  saveData();

  if (selectedProductName) {
    renderProductDetail();
  } else {
    renderModuleList();
  }
}

// Mark Single Batch Sold
function markBatchSold(batchId, event) {
  if (event) event.stopPropagation();
  const batch = appState.batches.find((b) => b.id === batchId);
  if (batch) {
    batch.status = "SOLD";
    batch.dateSold = new Date().toISOString();
    saveData();

    if (selectedProductName) {
      renderProductDetail();
    } else {
      renderModuleList();
    }
  }
}

// Render Category Level List (Grouped by Product Name)
function renderModuleList() {
  const container = document.getElementById("module-items-list");
  const query = document.getElementById("module-search").value.toLowerCase().trim();

  const categoryBatches = appState.batches.filter((b) => b.category === currentCategory);

  // Group batches by product name
  const productMap = {};
  categoryBatches.forEach((batch) => {
    const key = batch.name.toLowerCase();
    if (!productMap[key]) {
      productMap[key] = {
        displayName: batch.name,
        activeBatches: [],
        soldBatches: []
      };
    }
    if (batch.status === "ACTIVE") {
      productMap[key].activeBatches.push(batch);
    } else {
      productMap[key].soldBatches.push(batch);
    }
  });

  const productsList = Object.values(productMap);

  // Tab counters (Total unique products in active vs sold)
  const activeProducts = productsList.filter((p) => p.activeBatches.length > 0);
  const soldProducts = productsList.filter((p) => p.soldBatches.length > 0 && p.activeBatches.length === 0);

  document.getElementById("count-active").textContent = activeProducts.length;
  document.getElementById("count-sold").textContent = soldProducts.length;

  let displayProducts = currentCategoryTab === "ACTIVE" ? activeProducts : soldProducts;

  if (query) {
    displayProducts = displayProducts.filter((p) => p.displayName.toLowerCase().includes(query));
  }

  if (displayProducts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${query ? "No items matching your search." : currentCategoryTab === "ACTIVE" ? "No active stock items. Tap [+ Add New Stock] to begin!" : "No completed items yet."}
      </div>
    `;
    return;
  }

  container.innerHTML = displayProducts
    .map((prod) => {
      const activeCount = prod.activeBatches.length;
      const futureProfitSum = prod.activeBatches.reduce((acc, b) => acc + b.profit, 0);
      const realizedProfitSum = prod.soldBatches.reduce((acc, b) => acc + b.profit, 0);

      const safeName = prod.displayName.replace(/'/g, "\\'");

      return `
      <div class="stock-card" onclick="openProductDetail('${safeName}')">
        <div class="stock-card-top">
          <div>
            <span class="product-title">${prod.displayName}</span>
            <span class="batch-sub-badge">(${activeCount > 0 ? activeCount + " active batches" : "All sold"})</span>
          </div>
          ${
            activeCount > 0
              ? `<span class="stock-badge-future">+₹ ${futureProfitSum}</span>`
              : `<span class="stock-badge-profit">₹ ${realizedProfitSum}</span>`
          }
        </div>
        <div class="stock-card-bottom">
          <span style="font-size: 0.8rem; color: #94a3b8;">Tap to open batches & ledger</span>
          <span class="chevron">›</span>
        </div>
      </div>
    `;
    })
    .join("");
}

// Render Dedicated Product Ledger
function renderProductDetail() {
  const container = document.getElementById("detail-batches-list");
  const relevantBatches = appState.batches.filter(
    (b) => b.category === currentCategory && b.name.toLowerCase() === selectedProductName.toLowerCase()
  );

  const activeBatches = relevantBatches.filter((b) => b.status === "ACTIVE");
  const soldBatches = relevantBatches.filter((b) => b.status === "SOLD");

  const futureTotal = activeBatches.reduce((acc, b) => acc + b.profit, 0);
  const realizedTotal = soldBatches.reduce((acc, b) => acc + b.profit, 0);

  // Update Detail Header Cards
  document.getElementById("detail-active-count").textContent = activeBatches.length;
  document.getElementById("detail-future-profit").textContent = `₹ ${futureTotal}`;
  document.getElementById("detail-realized-profit").textContent = `₹ ${realizedTotal}`;

  if (relevantBatches.length === 0) {
    container.innerHTML = `<div class="empty-state">No batches recorded for this item.</div>`;
    return;
  }

  container.innerHTML = relevantBatches
    .map((batch, index) => {
      const isSold = batch.status === "SOLD";
      const addedDate = new Date(batch.dateAdded).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const soldDate = batch.dateSold
        ? new Date(batch.dateSold).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : null;

      let detailsHtml = "";
      if (batch.category === "petrol") {
        detailsHtml = `<span>${batch.liters}L × <strong>₹${batch.profitPerLiter}/L</strong></span>`;
      } else {
        detailsHtml = `<span>Cost: <strong>₹${batch.cost}</strong></span> <span>Sell: <strong>₹${batch.sales}</strong></span>`;
      }

      return `
      <div class="stock-card">
        <div class="stock-card-top">
          <div>
            <span style="font-weight: 600; font-size: 0.95rem; color: #e2e8f0;">Batch #${relevantBatches.length - index}</span>
            <span class="batch-sub-badge">${isSold ? "Sold: " + soldDate : "Added: " + addedDate}</span>
          </div>
          <span class="${isSold ? "stock-badge-profit" : "stock-badge-future"}">+₹ ${batch.profit}</span>
        </div>
        <div class="stock-card-bottom" style="margin-top: 6px;">
          <div class="price-details">${detailsHtml}</div>
          <div class="batch-actions">
            ${!isSold ? `<button class="sold-btn" onclick="markBatchSold('${batch.id}', event)">✓ Sold</button>` : ""}
            <button class="action-icon-btn" title="Edit Batch" onclick="openEditBatchModal('${batch.id}', event)">✏️</button>
            <button class="action-icon-btn danger" title="Delete Batch" onclick="deleteBatch('${batch.id}', event)">🗑️</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// Compute Aggregated Totals Across All Categories
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

  appState.batches.forEach((b) => {
    if (b.status === "ACTIVE") {
      futureProfit += b.profit;
    } else if (b.status === "SOLD" && b.dateSold) {
      const soldDate = new Date(b.dateSold);

      // Realized profit by category
      if (b.category === "grocery") groceryProfit += b.profit;
      if (b.category === "petrol") petrolProfit += b.profit;
      if (b.category === "fertilizer") fertilizerProfit += b.profit;

      // Realized profit by month
      if (soldDate.getMonth() === currentMonth && soldDate.getFullYear() === currentYear) {
        monthlyProfit += b.profit;
      }

      // Realized profit by rolling 7 days
      if (soldDate >= sevenDaysAgo && soldDate <= now) {
        weeklyProfit += b.profit;
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
