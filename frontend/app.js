const API = "http://127.0.0.1:8000";

let currentOffset = 0;
const LIMIT = 3;
let currentCategory = "";
let currentSort = "date_desc";
let totalCount = 0;
let loadedCount = 0;

// ── Startup ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    setLoading(true); 
    document.getElementById("date").valueAsDate = new Date();
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").max = today;
    document.getElementById("filter-category").value = "";
    document.getElementById("sort-order").value = "date_desc";
    currentCategory = "";
    currentSort = "date_desc";
    loadCategories();
    fetchExpenses(true); 
});

// ── Categories ────────────────────────────────────────────
async function loadCategories() {
    try {
        const res = await fetch(`${API}/categories`);
        const data = await res.json();

        const select = document.getElementById("category-select");
        const filterSelect = document.getElementById("filter-category");

        select.innerHTML = `<option value="">Select a category</option>`;
        data.forEach(cat => {
            select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
        });
        select.innerHTML += `<option value="__new__">+ Add new category</option>`;

        filterSelect.innerHTML = `<option value="">All Categories</option>`;
        data.forEach(cat => {
            filterSelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
        });

        renderCategorySummary(data);
    } catch (e) {
        console.error("Failed to load categories", e);
        document.getElementById("form-error").textContent = "Failed to load categories. Please refresh.";
        document.getElementById("form-error").classList.remove("hidden");
    }
}

function renderCategorySummary(data) {
    const container = document.getElementById("category-summary");
    const withExpenses = data.filter(c => parseFloat(c.total) > 0);

    if (withExpenses.length === 0) {
        container.innerHTML = `<p style="color:#888;font-size:0.9rem">No expenses yet.</p>`;
        return;
    }

    container.innerHTML = withExpenses.map(c => `
        <div class="category-row">
            <span><span class="category-tag">${c.name}</span></span>
            <span>₹${c.total}</span>
        </div>
    `).join("");
}

async function fetchExpenses(reset = false) {
    if (reset) {
        currentOffset = 0;
        loadedCount = 0;
        document.getElementById("expense-list").innerHTML = "";
    }

    setLoading(true);

    try {
        let url = `${API}/expenses?sort=${currentSort}&limit=${LIMIT}&offset=${currentOffset}`;
        if (currentCategory) url += `&category=${encodeURIComponent(currentCategory)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch expenses");

        const data = await res.json();
        totalCount = data.count;
        renderExpenses(data, reset);
    } catch (e) {
        document.getElementById("list-error").textContent = "Failed to load expenses. Please try again.";
        document.getElementById("list-error").classList.remove("hidden");
    } finally {
        setLoading(false);
    }
}

function renderExpenses(data, reset) {
    const list = document.getElementById("expense-list");
    document.getElementById("total-amount").textContent = data.total;
    document.getElementById("list-error").classList.add("hidden");

    if (reset && data.expenses.length === 0) {
        list.innerHTML = `<p style="color:#888;font-size:0.9rem;padding:12px 0">No expenses found.</p>`;
        document.getElementById("load-more-btn").classList.add("hidden");
        return;
    }

    data.expenses.forEach(exp => {
        const div = document.createElement("div");
        div.className = "expense-item";
        div.innerHTML = `
            <div>
                <span class="category-tag">${exp.category}</span>
                <span>${exp.description}</span>
                <div class="expense-meta">${exp.date}</div>
            </div>
            <div class="expense-amount">₹${exp.amount}</div>
        `;
        list.appendChild(div);
    });

    loadedCount += data.expenses.length;
    console.log("totalCount:", totalCount, "loadedCount:", loadedCount);
    if (loadedCount < totalCount) {
       document.getElementById("load-more-btn").classList.remove("hidden");
    } else {
        document.getElementById("load-more-btn").classList.add("hidden");
 }
}

// ── Filters ───────────────────────────────────────────────
let filterDebounce = null;

function applyFilters() {
    clearTimeout(filterDebounce);
    filterDebounce = setTimeout(() => {
      console.log("filter-category element value:", document.getElementById("filter-category").value);
      currentCategory = document.getElementById("filter-category").value;
      console.log("currentCategory set to:", currentCategory);
    fetchExpenses(true);
   }, 300);
}

// ── Load More ─────────────────────────────────────────────
function loadMore() {
    console.log("loadMore clicked - loadedCount:", loadedCount, "totalCount:", totalCount);
    if (loadedCount >= totalCount) {
        document.getElementById("load-more-btn").classList.add("hidden");
        return;
    }
    currentOffset += LIMIT;
    fetchExpenses(false);
}

// ── Submit Expense ────────────────────────────────────────
async function submitExpense() {
    const btn = document.getElementById("submit-btn");
    const errorEl = document.getElementById("form-error");
    const successEl = document.getElementById("form-success");

    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    const amount = document.getElementById("amount").value.trim();
    const categorySelect = document.getElementById("category-select").value;
    const categoryCustom = document.getElementById("category-custom").value.trim();
    const category = categorySelect === "__new__" ? categoryCustom : categorySelect;
    const description = document.getElementById("description").value.trim();
    const date = document.getElementById("date").value;

    // Frontend validation
    if (!amount || parseFloat(amount) <= 0) {
        return showError("Amount must be greater than zero.");
    }
    if (!category) {
        return showError("Please select or enter a category.");
    }
    if (!description) {
        return showError("Description is required.");
    }
    if (!date) {
        return showError("Date is required.");
    }

    let idempotencyKey = sessionStorage.getItem("pending_expense_key");
    if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem("pending_expense_key", idempotencyKey);
    }

    btn.disabled = true;
    btn.textContent = "Adding...";

    try {
        const res = await fetch(`${API}/expenses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                category,
                description,
                date
            })
        });

        if (!res.ok) {
            const err = await res.json();
            return showError(err.detail || "Failed to add expense.");
        }
        
        // Reset form
        document.getElementById("amount").value = "";
        document.getElementById("category-select").value = "";
        document.getElementById("category-custom").value = "";
        document.getElementById("description").value = "";
        document.getElementById("date").valueAsDate = new Date();

        showSuccess("Expense added successfully.");
        await loadCategories();
        await fetchExpenses(true);

    } catch (e) {
        showError("Network error. Please try again.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Add Expense";
    }
}

// ── Helpers ───────────────────────────────────────────────
function showError(msg) {
    const el = document.getElementById("form-error");
    el.textContent = msg;
    el.classList.remove("hidden");
}

function showSuccess(msg) {
    const el = document.getElementById("form-success");
    el.textContent = msg;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3000);
}

function setLoading(state) {
    document.getElementById("loading").classList.toggle("hidden", !state);
}

function handleCategoryChange() {
    const select = document.getElementById("category-select");
    const customInput = document.getElementById("category-custom");
    if (select.value === "__new__") {
        customInput.classList.remove("hidden");
        customInput.focus();
    } else {
        customInput.classList.add("hidden");
        customInput.value = "";
    }
}