const API_BASE = '/api';

// Global Chart Instances
let categoryChart, monthlyChart, savingsChart;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    initModals();
    initFilters();
    
    // View Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if(view) switchView(view);
        });
    });

    // Auth Forms
    const loginForm = document.getElementById('login-form');
    if(loginForm) loginForm.addEventListener('submit', handleLogin);

    const signupForm = document.getElementById('signup-form');
    if(signupForm) signupForm.addEventListener('submit', handleSignup);

    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Transaction Form
    const txForm = document.getElementById('transaction-form');
    if(txForm) txForm.addEventListener('submit', handleSaveTransaction);

    // Export CSV
    const exportBtn = document.getElementById('export-btn');
    if(exportBtn) exportBtn.addEventListener('click', handleExport);
});

/* =========================================
   Theme & UI
========================================= */
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const darkIcon = document.querySelector('.dark-icon');
    const lightIcon = document.querySelector('.light-icon');

    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            
            // Redraw charts to match theme if they exist
            if(categoryChart) loadDashboardSummary();
        });
    }

    function updateThemeIcon(theme) {
        if(!darkIcon || !lightIcon) return;
        if(theme === 'dark') {
            darkIcon.style.display = 'none';
            lightIcon.style.display = 'inline-block';
        } else {
            darkIcon.style.display = 'inline-block';
            lightIcon.style.display = 'none';
        }
    }
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${viewId}`);
    if(targetView) targetView.style.display = 'block';
    
    const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if(navItem) navItem.classList.add('active');

    if(viewId === 'dashboard') loadDashboardSummary();
    if(viewId === 'transactions') loadTransactions();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-check-circle';
    if(type === 'error') iconClass = 'fa-circle-exclamation';
    if(type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* =========================================
   Authentication
========================================= */
async function checkAuth() {
    // Only check on protected pages (like index.html)
    if(document.getElementById('user-greeting')) {
        try {
            const res = await fetch(`${API_BASE}/me`);
            if(res.ok) {
                const data = await res.json();
                document.getElementById('user-greeting').textContent = `Welcome back, ${data.name}!`;
                loadDashboardSummary();
            } else {
                window.location.href = '/login';
            }
        } catch(err) {
            console.error(err);
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if(res.ok) {
            window.location.href = '/';
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch(err) {
        showToast('Network error', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if(res.ok) {
            showToast('Account created! Please login.', 'success');
            setTimeout(() => window.location.href = '/login', 2000);
        } else {
            showToast(data.error || 'Signup failed', 'error');
        }
    } catch(err) {
        showToast('Network error', 'error');
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/logout`, { method: 'POST' });
        window.location.href = '/login';
    } catch(err) {
        console.error(err);
    }
}

/* =========================================
   Dashboard & Analytics
========================================= */
async function loadDashboardSummary() {
    try {
        const res = await fetch(`${API_BASE}/summary`);
        if(!res.ok) return;
        const data = await res.json();

        // Update cards
        document.getElementById('total-income').textContent = `$${data.total_income.toFixed(2)}`;
        document.getElementById('total-expense').textContent = `$${data.total_expense.toFixed(2)}`;
        document.getElementById('current-balance').textContent = `$${data.balance.toFixed(2)}`;

        // Check Budget Alert (Static threshold for demo: $2000)
        checkBudgetAlert(data.total_expense);

        // Render Charts
        renderCharts(data);
    } catch(err) {
        console.error(err);
    }
}

function checkBudgetAlert(totalExpense) {
    const BUDGET_LIMIT = 2000;
    if(totalExpense > BUDGET_LIMIT) {
        // Only show once per session
        if(!sessionStorage.getItem('budgetAlertShown')) {
            showToast(`Warning: You have exceeded your monthly budget of $${BUDGET_LIMIT}!`, 'warning');
            sessionStorage.setItem('budgetAlertShown', 'true');
        }
    }
}

function renderCharts(data) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#6b7280';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // 1. Category Pie Chart
    const ctxPie = document.getElementById('categoryPieChart');
    if(ctxPie) {
        if(categoryChart) categoryChart.destroy();
        const categories = Object.keys(data.category_expenses);
        const amounts = Object.values(data.category_expenses);
        
        categoryChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: categories.length ? categories : ['No Data'],
                datasets: [{
                    data: amounts.length ? amounts : [1],
                    backgroundColor: amounts.length ? [
                        '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
                        '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'
                    ] : [isDark ? '#334155' : '#e5e7eb'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } },
                cutout: '70%'
            }
        });
    }

    // 2. Monthly Expenses Bar Chart
    const ctxBar = document.getElementById('monthlyBarChart');
    if(ctxBar) {
        if(monthlyChart) monthlyChart.destroy();
        const months = Object.keys(data.monthly_expenses).sort();
        const amounts = months.map(m => data.monthly_expenses[m]);

        monthlyChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: months.length ? months : ['No Data'],
                datasets: [{
                    label: 'Expenses',
                    data: amounts.length ? amounts : [0],
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: gridColor }, beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 3. Savings Line Chart
    const ctxLine = document.getElementById('savingsLineChart');
    if(ctxLine) {
        if(savingsChart) savingsChart.destroy();
        const months = Object.keys(data.monthly_savings).sort();
        const amounts = months.map(m => data.monthly_savings[m]);

        savingsChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: months.length ? months : ['No Data'],
                datasets: [{
                    label: 'Net Savings',
                    data: amounts.length ? amounts : [0],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: gridColor } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

/* =========================================
   Transactions Management
========================================= */
function initFilters() {
    const fMonth = document.getElementById('filter-month');
    const fType = document.getElementById('filter-type');
    const fCategory = document.getElementById('filter-category');
    
    [fMonth, fType, fCategory].forEach(el => {
        if(el) el.addEventListener('change', loadTransactions);
    });

    // Populate category filter options
    if(fCategory) {
        const cats = ['Food', 'Housing', 'Transportation', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Salary', 'Other'];
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            fCategory.appendChild(opt);
        });
    }
}

async function loadTransactions() {
    const tbody = document.getElementById('transactions-body');
    const emptyState = document.getElementById('empty-state');
    if(!tbody) return;

    const month = document.getElementById('filter-month').value;
    const type = document.getElementById('filter-type').value;
    const category = document.getElementById('filter-category').value;

    let url = `${API_BASE}/transactions?`;
    if(month) url += `month=${month}&`;
    if(type) url += `type=${type}&`;
    if(category) url += `category=${category}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        tbody.innerHTML = '';
        if(data.length === 0) {
            tbody.parentElement.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            tbody.parentElement.style.display = 'table';
            emptyState.style.display = 'none';
            
            data.forEach(tx => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${tx.date}</td>
                    <td>${tx.notes || '-'}</td>
                    <td>${tx.category}</td>
                    <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
                    <td style="font-weight:600; color: ${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                        ${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)}
                    </td>
                    <td>
                        <button class="action-btn edit" onclick="openEditModal('${tx._id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" onclick="deleteTransaction('${tx._id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(err) {
        console.error(err);
    }
}

/* =========================================
   Modals & CRUD
========================================= */
function initModals() {
    const modal = document.getElementById('transaction-modal');
    const openBtn = document.getElementById('open-add-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');

    if(!modal) return;

    const closeModal = () => {
        modal.classList.remove('show');
        document.getElementById('transaction-form').reset();
        document.getElementById('tx-id').value = '';
        document.getElementById('modal-title').textContent = 'Add Transaction';
    };

    if(openBtn) openBtn.addEventListener('click', () => {
        // Set default date to today
        document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
        modal.classList.add('show');
    });
    
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if(e.target === modal) closeModal();
    });
}

async function handleSaveTransaction(e) {
    e.preventDefault();
    
    const id = document.getElementById('tx-id').value;
    const type = document.querySelector('input[name="tx_type"]:checked').value;
    const date = document.getElementById('tx-date').value;
    const amount = document.getElementById('tx-amount').value;
    const category = document.getElementById('tx-category').value;
    const notes = document.getElementById('tx-notes').value;

    const payload = { type, date, amount, category, notes };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/transactions/${id}` : `${API_BASE}/transactions`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            showToast(`Transaction ${id ? 'updated' : 'added'} successfully!`);
            document.getElementById('close-modal').click();
            loadDashboardSummary();
            if(document.getElementById('view-transactions').style.display !== 'none') {
                loadTransactions();
            }
        } else {
            const data = await res.json();
            showToast(data.error || 'Error saving transaction', 'error');
        }
    } catch(err) {
        showToast('Network error', 'error');
    }
}

window.openEditModal = async function(id) {
    // Fetch all tx, find this one (inefficient but works for now without specific GET /tx/:id endpoint)
    try {
        const res = await fetch(`${API_BASE}/transactions`);
        const data = await res.json();
        const tx = data.find(t => t._id === id);
        
        if(tx) {
            document.getElementById('tx-id').value = tx._id;
            document.getElementById(`type-${tx.type}`).checked = true;
            document.getElementById('tx-date').value = tx.date;
            document.getElementById('tx-amount').value = tx.amount;
            document.getElementById('tx-category').value = tx.category;
            document.getElementById('tx-notes').value = tx.notes || '';
            
            document.getElementById('modal-title').textContent = 'Edit Transaction';
            document.getElementById('transaction-modal').classList.add('show');
        }
    } catch(err) {
        console.error(err);
    }
};

window.deleteTransaction = async function(id) {
    if(!confirm('Are you sure you want to delete this transaction?')) return;

    try {
        const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
        if(res.ok) {
            showToast('Transaction deleted');
            loadDashboardSummary();
            loadTransactions();
        } else {
            showToast('Error deleting transaction', 'error');
        }
    } catch(err) {
        showToast('Network error', 'error');
    }
};

/* =========================================
   Export
========================================= */
function handleExport() {
    window.location.href = `${API_BASE}/export`;
}
