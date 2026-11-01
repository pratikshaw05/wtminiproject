
const STORAGE_KEY = "spendwise_expenses";

const categories = ["Food", "Travel", "Shopping", "Bills", "Education", "Health", "Other"];

const categoryIcons = {
    Food: "🍽️",
    Travel: "🚗",
    Shopping: "🛍️",
    Bills: "🧾",
    Education: "📚",
    Health: "💊",
    Other: "📦"
};

const pageInfo = {
    dashboard: ["Dashboard", "Your money, clearly organised."],
    transactions: ["Transactions", "Manage all your expense records."],
    analytics: ["Analytics", "Understand your spending patterns."],
    categories: ["Categories", "Explore spending by category."]
};

function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeSampleExpenses() {
    const today = new Date();

    function dateAgo(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    return [
        { id: 1, name: "Grocery Shopping", amount: 850, category: "Food", date: dateAgo(0) },
        { id: 2, name: "College Travel", amount: 250, category: "Travel", date: dateAgo(1) },
        { id: 3, name: "Study Materials", amount: 600, category: "Education", date: dateAgo(2) },
        { id: 4, name: "Mobile Recharge", amount: 299, category: "Bills", date: dateAgo(3) },
        { id: 5, name: "New Clothes", amount: 1200, category: "Shopping", date: dateAgo(5) },
        { id: 6, name: "Medical Supplies", amount: 350, category: "Health", date: dateAgo(8) }
    ];
}

function loadExpenses() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (error) {
        console.error("Unable to load saved expenses:", error);
    }

    return makeSampleExpenses();
}

let expenses = loadExpenses();
let editingId = null;
let charts = {};

const money = value =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(value);

function saveExpenses() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (error) {
        alert("Unable to save data in this browser.");
    }
}

function currentMonth() {
    return todayString().slice(0, 7);
}

function getMonthKey(date) {
    return date.slice(0, 7);
}

function totalAmount(list) {
    return list.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function categoryTotals() {
    const totals = {};

    categories.forEach(category => {
        totals[category] = 0;
    });

    expenses.forEach(expense => {
        totals[expense.category] =
            (totals[expense.category] || 0) + Number(expense.amount);
    });

    return totals;
}

/* NAVIGATION: Each menu opens a separate page */
function navigateTo(page) {
    if (!pageInfo[page]) page = "dashboard";

    document.querySelectorAll(".page").forEach(section => {
        section.classList.toggle("active", section.id === page);
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.page === page);
    });

    document.getElementById("pageTitle").textContent = pageInfo[page][0];
    document.getElementById("pageSubtitle").textContent = pageInfo[page][1];

    history.replaceState(null, "", "#" + page);

    renderAll();
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        navigateTo(link.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.go));
});

/* DASHBOARD SUMMARY */
function renderSummary() {
    const total = totalAmount(expenses);

    const monthTotal = totalAmount(
        expenses.filter(expense => getMonthKey(expense.date) === currentMonth())
    );

    document.getElementById("totalExpense").textContent = money(total);
    document.getElementById("monthlyExpense").textContent = money(monthTotal);
    document.getElementById("transactionCount").textContent = expenses.length;
}

/* SAFE TABLE CREATION */
function createTransactionRow(expense) {
    const row = document.createElement("tr");

    function cell(text, className = "") {
        const td = document.createElement("td");
        td.textContent = text;
        if (className) td.className = className;
        return td;
    }

    row.appendChild(cell(expense.name, "expense-title"));

    const categoryCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = expense.category;
    categoryCell.appendChild(badge);
    row.appendChild(categoryCell);

    row.appendChild(cell(expense.date));
    row.appendChild(cell(money(Number(expense.amount)), "amount"));

    const actions = document.createElement("td");

    const edit = document.createElement("button");
    edit.className = "action-btn edit-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editExpense(expense.id));

    const remove = document.createElement("button");
    remove.className = "action-btn delete-btn";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteExpense(expense.id));

    actions.append(edit, remove);
    row.appendChild(actions);

    return row;
}

function renderTable(listId, emptyId, list) {
    const tbody = document.getElementById(listId);
    const empty = document.getElementById(emptyId);

    tbody.replaceChildren();

    list.forEach(expense => {
        tbody.appendChild(createTransactionRow(expense));
    });

    empty.style.display = list.length ? "none" : "block";
}

function renderTransactions() {
    const search = document.getElementById("searchInput").value
        .trim().toLowerCase();

    const category = document.getElementById("categoryFilter").value;
    const month = document.getElementById("monthFilter").value;

    const filtered = expenses
        .filter(expense => {
            const matchesSearch =
                expense.name.toLowerCase().includes(search) ||
                expense.category.toLowerCase().includes(search);

            const matchesCategory = !category || expense.category === category;
            const matchesMonth = !month || getMonthKey(expense.date) === month;

            return matchesSearch && matchesCategory && matchesMonth;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

    renderTable("expenseList", "listEmpty", filtered);
}

function renderRecent() {
    const recent = [...expenses]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    renderTable("recentList", "recentEmpty", recent);
}

/* ANALYTICS AND CATEGORY REPORTS */
function renderAnalytics() {
    const total = totalAmount(expenses);
    const average = expenses.length ? total / expenses.length : 0;
    const totals = categoryTotals();

    const top = Object.entries(totals)
        .filter(([, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1])[0];

    document.getElementById("analyticsTotal").textContent = money(total);
    document.getElementById("averageExpense").textContent = money(average);
    document.getElementById("topCategory").textContent = top ? top[0] : "—";

    const report = document.getElementById("categoryReport");
    report.replaceChildren();

    const maxAmount = Math.max(...Object.values(totals), 1);

    categories.forEach(category => {
        const amount = totals[category];
        const count = expenses.filter(e => e.category === category).length;

        const row = document.createElement("div");
        row.className = "report-row";

        const label = document.createElement("span");
        label.textContent = `${categoryIcons[category]} ${category}`;

        const track = document.createElement("div");
        track.className = "report-track";

        const fill = document.createElement("div");
        fill.className = "report-fill";
        fill.style.width = `${(amount / maxAmount) * 100}%`;
        track.appendChild(fill);

        const value = document.createElement("span");
        value.className = "report-amount";
        value.textContent = `${money(amount)} · ${count}`;

        row.append(label, track, value);
        report.appendChild(row);
    });
}

function renderCategories() {
    const container = document.getElementById("categoryCards");
    const totals = categoryTotals();
    container.replaceChildren();

    categories.forEach(category => {
        const count = expenses.filter(e => e.category === category).length;

        const card = document.createElement("div");
        card.className = "category-card";

        const icon = document.createElement("div");
        icon.className = "category-symbol";
        icon.textContent = categoryIcons[category];

        const title = document.createElement("h4");
        title.textContent = category;

        const amount = document.createElement("p");
        amount.textContent = money(totals[category]);

        const info = document.createElement("small");
        info.textContent = `${count} transaction${count === 1 ? "" : "s"}`;

        card.append(icon, title, amount, info);
        container.appendChild(card);
    });
}

/* CHARTS */
function getLastSixMonths() {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

        months.push({
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            label: date.toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit"
            })
        });
    }

    return months;
}

function makeChart(canvasId, type, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(canvas, {
        type,
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            ...options
        }
    });
}

function renderCharts() {
    if (typeof Chart === "undefined") return;

    const months = getLastSixMonths();

    const monthAmounts = months.map(month =>
        totalAmount(expenses.filter(e => getMonthKey(e.date) === month.key))
    );

    const totals = categoryTotals();
    const usedCategories = categories.filter(category => totals[category] > 0);

    const chartColors = [
        "#7965e8", "#4c9fe8", "#f3a45b",
        "#ed6c83", "#42b7a4", "#9a83e9", "#a0a3b5"
    ];

    const monthlyData = {
        labels: months.map(month => month.label),
        datasets: [{
            label: "Expenses (₹)",
            data: monthAmounts,
            backgroundColor: "#7965e8",
            borderRadius: 7,
            maxBarThickness: 42
        }]
    };

    const categoryData = {
        labels: usedCategories.length ? usedCategories : ["No expenses"],
        datasets: [{
            data: usedCategories.length
                ? usedCategories.map(category => totals[category])
                : [1],
            backgroundColor: usedCategories.length
                ? chartColors.slice(0, usedCategories.length)
                : ["#e8e7ef"],
            borderWidth: 3,
            borderColor: "#ffffff"
        }]
    };

    const barOptions = {
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: value => "₹" + value }
            }
        }
    };

    const doughnutOptions = {
        plugins: {
            legend: { position: "bottom" },
            tooltip: {
                callbacks: {
                    label: context => context.label === "No expenses"
                        ? "No expenses recorded"
                        : `${context.label}: ${money(context.raw)}`
                }
            }
        }
    };

    const activePage = document.querySelector(".page.active");

    if (activePage?.id === "dashboard") {
        makeChart("monthlyChart", "bar", monthlyData, barOptions);
        makeChart("categoryChart", "doughnut", categoryData, doughnutOptions);
    }

    if (activePage?.id === "analytics") {
        makeChart("analyticsMonthlyChart", "bar", monthlyData, barOptions);
        makeChart("analyticsCategoryChart", "pie", categoryData, doughnutOptions);
    }
}

/* ADD / EDIT EXPENSE */
function openForm() {
    editingId = null;
    document.getElementById("expenseForm").reset();
    document.getElementById("expenseDate").value = todayString();
    document.getElementById("formTitle").textContent = "Add Expense";
    document.getElementById("saveButton").textContent = "Save Expense";
    document.getElementById("expenseModal").classList.add("show");
}

function closeForm() {
    document.getElementById("expenseModal").classList.remove("show");
}

document.getElementById("addExpenseBtn").addEventListener("click", openForm);
document.getElementById("closeModal").addEventListener("click", closeForm);
document.getElementById("cancelModal").addEventListener("click", closeForm);

document.getElementById("expenseModal").addEventListener("click", event => {
    if (event.target.id === "expenseModal") closeForm();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeForm();
});

function editExpense(id) {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;

    editingId = id;

    document.getElementById("expenseName").value = expense.name;
    document.getElementById("expenseAmount").value = expense.amount;
    document.getElementById("expenseCategory").value = expense.category;
    document.getElementById("expenseDate").value = expense.date;
    document.getElementById("formTitle").textContent = "Edit Expense";
    document.getElementById("saveButton").textContent = "Update Expense";
    document.getElementById("expenseModal").classList.add("show");
}

document.getElementById("expenseForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("expenseName").value.trim();
    const amount = Number(document.getElementById("expenseAmount").value);
    const category = document.getElementById("expenseCategory").value;
    const date = document.getElementById("expenseDate").value;

    if (!name || !Number.isFinite(amount) || amount <= 0 || !date) {
        alert("Please enter valid expense details.");
        return;
    }

    if (editingId !== null) {
        expenses = expenses.map(expense =>
            expense.id === editingId
                ? { ...expense, name, amount, category, date }
                : expense
        );
    } else {
        expenses.push({
            id: Date.now(),
            name,
            amount,
            category,
            date
        });
    }

    saveExpenses();
    closeForm();
    renderAll();
});

/* DELETE EXPENSE */
function deleteExpense(id) {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;

    if (!confirm(`Delete "${expense.name}"? This action cannot be undone.`)) {
        return;
    }

    expenses = expenses.filter(item => item.id !== id);
    saveExpenses();
    renderAll();
}

/* SEARCH AND FILTER */
document.getElementById("searchInput").addEventListener("input", renderTransactions);
document.getElementById("categoryFilter").addEventListener("change", renderTransactions);
document.getElementById("monthFilter").addEventListener("change", renderTransactions);

/* EXPORT EXPENSES TO CSV */
document.getElementById("exportBtn").addEventListener("click", () => {
    if (!expenses.length) {
        alert("There are no expenses to export.");
        return;
    }

    const escapeCSV = value =>
        `"${String(value).replace(/"/g, '""')}"`;

    const rows = [
        ["Expense", "Amount", "Category", "Date"],
        ...expenses.map(e => [e.name, e.amount, e.category, e.date])
    ];

    const csv = rows.map(row => row.map(escapeCSV).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SpendWise-Expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
});

/* REFRESH THE CURRENT PAGE */
function renderAll() {
    renderSummary();
    renderRecent();
    renderTransactions();
    renderAnalytics();
    renderCategories();
    renderCharts();
}

saveExpenses();

const initialPage = location.hash.replace("#", "");
navigateTo(pageInfo[initialPage] ? initialPage : "dashboard");
