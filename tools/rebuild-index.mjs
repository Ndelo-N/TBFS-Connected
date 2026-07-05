#!/usr/bin/env node
/**
 * Rebuild index.html as a display-only dashboard (F-02 / F-05 / F-18).
 *
 * Keeps:  <head> (minus CDN libs), full <style>, update banner, nav mount,
 *         the dashboard markup (lines 851–957 of the original).
 * Drops:  every hidden tab div (calculator/clients/stockvel/loans/reports/
 *         income-table/settings), the legacy AppState mutation engine,
 *         calculateAdvancedInterest (9%/15%/20% path), the duplicate
 *         calculator/stockvel/reports/settings/CloudBackup code — ~6,000
 *         lines of duplicated or state-corrupting logic.
 * Adds:   a slim read-only dashboard script with esc()-escaped rendering
 *         and redirect stubs for every removed entry point.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const orig = readFileSync('index.html', 'utf8').split('\n');
const L = (a, b) => orig.slice(a - 1, b).join('\n'); // 1-based inclusive

/* ---------- PART A: head + banner + nav + main open (1–675) --------- */
let partA = L(1, 675);
// Remove the three CDN library tags — the dashboard no longer generates
// PDFs/Excel/charts (those live on their dedicated pages).
partA = partA
    .split('\n')
    .filter(line => !/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(line))
    .join('\n');

/* ---------- PART B: dashboard markup (851–957), lightly edited ------- */
let partB = L(851, 957);

// Data Management buttons → links to the real pages (dashboard no longer mutates)
const dmFrom = `            <h3 style="margin-top: 30px;">Data Management</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="backupData()">&#128190; Backup Data</button>
                <button class="btn" onclick="restoreData()">&#128260; Restore Data</button>
                <button class="btn btn-danger" onclick="clearAllData()">&#128465; Clear All Data</button>
            </div>`;
const dmTo = `            <h3 style="margin-top: 30px;">Quick Actions</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;">
                <a class="btn" href="active-loans.html">&#128179; Record a Payment</a>
                <a class="btn" href="calculator.html">&#128203; New Loan</a>
                <a class="btn btn-secondary" href="settings.html">&#128190; Backup &amp; Settings</a>
            </div>`;
if (!partB.includes(dmFrom)) { console.error('anchor missing: data management'); process.exit(1); }
partB = partB.replace(dmFrom, dmTo);

// Remove the Undo Last Payment button (payment mutations live in active-loans)
const undoFrom = `                    <button class="btn" id="undoLastPaymentBtn" onclick="undoLastPayment()" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 8px 16px; font-size: 14px; display: none;">
                        &#128260; Undo Last Payment
                    </button>`;
if (!partB.includes(undoFrom)) { console.error('anchor missing: undo button'); process.exit(1); }
partB = partB.replace(undoFrom, '');

// Dynamic profit-goal label
const goalFrom = `<p style="margin: 0; color: #636e72; font-size: 14px;">Goal: R500,000</p>`;
if (!partB.includes(goalFrom)) { console.error('anchor missing: goal label'); process.exit(1); }
partB = partB.replace(goalFrom,
    `<p style="margin: 0; color: #636e72; font-size: 14px;" id="profitGoalLabel">Goal: R500,000</p>`);

/* ---------- PART C: closers + slim script + shared modules ----------- */
const partC = `
        </div>
    </main>

    <!-- Shared Modules -->
    <script src="shared/sanitize.js"></script>
    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>
    <script src="shared/navigation.js"></script>

    <script>
        /**
         * TBFS Dashboard — display-only (security remediation series)
         *
         * This page READS state and renders it. Every mutation — payments,
         * loan creation, status changes, backups, restores — lives on its
         * dedicated page. The previous in-page engine (a second, divergent
         * payment/interest implementation) has been removed. (F-02)
         */
        const APP_VERSION = '1.9.0';

        let AppState = AppStateManager.load();

        const Dashboard = {
            init() {
                if (typeof Navigation !== 'undefined') {
                    Navigation.init('dashboard');
                }
                this.refresh();
                AppStateManager.onUpdate(() => {
                    AppState = AppStateManager.load();
                    this.refresh();
                });
            },

            refresh() {
                const s = AppState;
                const rand = (v) => 'R ' + (Number(v) || 0).toLocaleString('en-ZA',
                    { minimumFractionDigits: 0, maximumFractionDigits: 2 });

                // Financial overview (deployed/memberFundsHeld are derived on load)
                document.getElementById('totalCapital').textContent = rand(s.capital);
                document.getElementById('deployedCapital').textContent = rand(s.deployed);
                document.getElementById('activeLoans').textContent =
                    s.loans.filter(l => l.status === 'active').length;

                // Profitability
                const totalProfit = (s.totalInterestEarned || 0) + (s.totalFeesEarned || 0) +
                                    (s.totalPenaltiesEarned || 0);
                document.getElementById('totalInterestEarned').textContent = rand(s.totalInterestEarned);
                document.getElementById('totalFeesEarned').textContent = rand(s.totalFeesEarned);
                document.getElementById('totalProfit').textContent = rand(totalProfit);

                // Profit goal
                const goal = (Number(s.profitGoal) > 0) ? Number(s.profitGoal) : 500000;
                const pct = Math.min(100, (totalProfit / goal * 100)).toFixed(1);
                const remainingToGoal = Math.max(0, goal - totalProfit);
                document.getElementById('profitGoalLabel').textContent = 'Goal: ' + rand(goal);
                document.getElementById('profitAmount').textContent = rand(totalProfit);
                document.getElementById('profitPercentage').textContent = pct + '%';
                document.getElementById('profitProgressBar').style.width = pct + '%';
                const remEl = document.getElementById('profitRemaining');
                if (remainingToGoal > 0) {
                    remEl.textContent = rand(remainingToGoal) + ' remaining to reach goal';
                    remEl.style.color = '';
                    remEl.style.fontWeight = '';
                } else {
                    remEl.textContent = '\\u2705 Goal achieved! Exceeded by ' + rand(totalProfit - goal);
                    remEl.style.color = '#27ae60';
                    remEl.style.fontWeight = 'bold';
                }

                // Portfolio stats
                document.getElementById('totalLoans').textContent = s.loans.length;
                document.getElementById('completedLoans').textContent =
                    s.loans.filter(l => l.status === 'completed').length;
                document.getElementById('defaultedLoans').textContent =
                    s.loans.filter(l => l.status === 'defaulted').length;
                const closed = s.loans.filter(l => l.status === 'completed' || l.status === 'defaulted').length;
                const defaulted = s.loans.filter(l => l.status === 'defaulted').length;
                document.getElementById('defaultRate').textContent =
                    (closed > 0 ? ((defaulted / closed) * 100).toFixed(1) : 0) + '%';

                this.renderAlerts(s);
                this.renderTransactions(s);
            },

            renderAlerts(s) {
                const alerts = document.getElementById('dashboardAlerts');
                let html = '';

                const activeLoans = s.loans.filter(l => l.status === 'active');
                if (activeLoans.length >= 80) {
                    html += '<div class="alert alert-warning">\\u26A0\\uFE0F <strong>High Loan Volume:</strong> ' +
                        activeLoans.length + ' active loans. Consider monitoring capacity.</div>';
                }
                if (s.deployed > 80000) {
                    html += '<div class="alert alert-danger">\\u274C <strong>Deployment Limit Exceeded:</strong> ' +
                        'Deployed ' + esc(Calculations.formatCurrency(s.deployed)) + '. Maximum deployment is R80,000!</div>';
                }
                // Lendable funds = capital minus member funds held in trust (F-06)
                const lendable = (s.capital || 0) - (s.memberFundsHeld || 0);
                if (lendable < 20000) {
                    html += '<div class="alert alert-warning">\\u26A0\\uFE0F <strong>Reserve Capital Low:</strong> ' +
                        esc(Calculations.formatCurrency(lendable)) +
                        ' lendable after member funds (' + esc(Calculations.formatCurrency(s.memberFundsHeld || 0)) +
                        ' held for stockvel members).</div>';
                }

                // Overdue escalation
                const today = new Date();
                const overdue = [], atRisk = [], suggested = [];
                activeLoans.forEach(loan => {
                    if (!loan.created_at || loan.start_month_index === undefined) return;
                    const dueDate = Calculations.getLoanPaymentDueDate(loan, loan.payments_made || 0);
                    if (!dueDate || dueDate >= today) return;
                    const daysOverdue = Math.floor((today - dueDate) / 86400000);
                    const missed = Calculations.countConsecutiveMissedPayments(loan);
                    const level = Calculations.getEscalationLevel(missed);
                    const entry = {
                        name: loan.client_name || ('Loan #' + loan.loan_id),
                        id: loan.loan_id,
                        amount: loan.remaining_principal || 0,
                        daysOverdue, missed,
                        monthly: loan.monthly_payment || 0
                    };
                    if (level === 'default-suggested') suggested.push(entry);
                    else if (level === 'at-risk') atRisk.push(entry);
                    else overdue.push(entry);
                });

                const row = (l, mid, right) =>
                    '<div style="display:flex;justify-content:space-between;align-items:center;' +
                    'padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.1);">' +
                    '<span><strong>' + esc(l.name) + '</strong> (Loan #' + esc(l.id) + ') - ' + mid + '</span>' +
                    '<span style="font-weight:700;">' + right + '</span></div>';

                if (suggested.length) {
                    html += '<div class="alert alert-danger">\\uD83D\\uDD34 <strong>DEFAULT SUGGESTED (' +
                        suggested.length + ' loans - 3+ missed payments):</strong>' +
                        '<div style="margin-top:8px;font-size:13px;">' +
                        suggested.map(l => row(l, l.missed + ' missed payments',
                            esc(Calculations.formatCurrency(l.amount)) + ' outstanding')).join('') +
                        '</div><div style="margin-top:8px;"><a href="active-loans.html">Manage in Active Loans \\u2192</a></div></div>';
                }
                if (atRisk.length) {
                    html += '<div class="alert alert-warning">\\uD83D\\uDD36 <strong>AT RISK (' +
                        atRisk.length + ' loans - 2 missed payments):</strong>' +
                        '<div style="margin-top:8px;font-size:13px;">' +
                        atRisk.map(l => row(l, l.daysOverdue + ' days overdue',
                            esc(Calculations.formatCurrency(l.monthly)) + ' due')).join('') + '</div></div>';
                }
                if (overdue.length) {
                    html += '<div class="alert alert-warning">\\u26A0\\uFE0F <strong>OVERDUE PAYMENTS (' +
                        overdue.length + ' loans):</strong>' +
                        '<div style="margin-top:8px;font-size:13px;">' +
                        overdue.map(l => row(l, l.daysOverdue + ' days overdue',
                            esc(Calculations.formatCurrency(l.monthly)) + ' due')).join('') + '</div></div>';
                }
                const total = overdue.length + atRisk.length + suggested.length;
                if (total > 0) {
                    const amt = [...overdue, ...atRisk, ...suggested].reduce((sum, l) => sum + l.amount, 0);
                    html += '<div style="background:#f0f0f0;padding:10px 15px;border-radius:8px;' +
                        'margin-top:10px;font-size:13px;text-align:center;"><strong>' + total +
                        ' overdue loan(s)</strong> with <strong>' + esc(Calculations.formatCurrency(amt)) +
                        '</strong> total outstanding principal</div>';
                }
                alerts.innerHTML = html;
                if (typeof window.updateAppBadge === 'function') window.updateAppBadge(total);
            },

            renderTransactions(s) {
                const container = document.getElementById('transactionHistoryList');
                const txs = (s.transactions || []).slice(-20).reverse();
                if (!txs.length) {
                    container.innerHTML = '<p style="color: #636e72; text-align: center; padding: 20px;">No transactions yet.</p>';
                    return;
                }
                container.innerHTML = txs.map(tx => {
                    const when = new Date(tx.timestamp || tx.date || Date.now());
                    const timeStr = when.toLocaleString('en-ZA', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                    let icon = '\\u2699';
                    switch (tx.type) {
                        case 'payment': icon = '\\uD83D\\uDCB3'; break;
                        case 'loan_created': icon = '\\uD83D\\uDCCB'; break;
                        case 'client_status':
                        case 'status_change': icon = '\\uD83D\\uDC64'; break;
                        case 'stockvel_receipt':
                        case 'stockvel_payout': icon = '\\uD83C\\uDF81'; break;
                    }
                    const desc = tx.description ||
                        (tx.details && tx.details.clientName
                            ? 'Payment \\u2014 ' + tx.details.clientName +
                              ' (Loan #' + tx.details.loanId + ')'
                            : tx.type || 'Activity');
                    return '<div style="border-bottom: 1px solid #ecf0f1; padding: 12px 0;">' +
                        '<div style="display: flex; align-items: start; gap: 12px;">' +
                        '<div style="font-size: 24px;">' + icon + '</div>' +
                        '<div style="flex: 1;">' +
                        '<div style="font-weight: 500; color: #2c3e50; margin-bottom: 4px;">' + esc(desc) + '</div>' +
                        '<div style="font-size: 12px; color: #636e72;">' + esc(timeStr) + '</div>' +
                        '</div></div></div>';
                }).join('');
            }
        };

        // ----- Service-worker update banner ------------------------------
        let waitingServiceWorker = null;
        window.addEventListener('swUpdateAvailable', (e) => {
            waitingServiceWorker = e.detail && e.detail.worker;
            showUpdateBanner();
        });

        function showUpdateBanner() {
            const banner = document.getElementById('updateBanner');
            if (banner) banner.style.display = 'block';
        }

        function dismissUpdateBanner() {
            const banner = document.getElementById('updateBanner');
            if (banner) banner.style.display = 'none';
        }

        function activateUpdate() {
            if (waitingServiceWorker) {
                try {
                    waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
                    const banner = document.getElementById('updateBanner');
                    if (banner) {
                        banner.innerHTML = '<div style="max-width: 1200px; margin: 0 auto; text-align: center;">' +
                            '<strong>\\u231B Updating...</strong>' +
                            '<p style="margin: 5px 0 0 0; font-size: 14px;">The app will reload in a moment</p></div>';
                    }
                    setTimeout(() => window.location.reload(), 3000);
                } catch (err) {
                    window.location.reload();
                }
            } else {
                window.location.reload();
            }
        }

        // ----- Redirect stubs for removed entry points --------------------
        // The dashboard's old engine is gone; anything still invoking these
        // names lands on the page that owns the operation. (F-02)
        (function installRedirects() {
            const goto = (page) => () => { window.location.href = page; };
            const map = {
                'active-loans.html': ['makePayment', 'undoLastPayment', 'updateLoanStatus',
                    'adjustActiveLoan', 'addLateInterest', 'increaseLoanAmount', 'exportToExcel',
                    'generateLoanStatusPDF'],
                'calculator.html': ['calculateLoan', 'acceptLoan', 'generatePDF', 'displayResults'],
                'clients.html': ['updateClientStatus'],
                'stockvel.html': ['recordReceipt', 'payoutBonus', 'payoutContributions',
                    'renewMembership', 'renewMembershipByNumber', 'viewMemberDetails',
                    'refreshMemberRegistry', 'exportMemberRegistry', 'generateBonusReport',
                    'exportBonusReport', 'generateMemberDisbursementPDF', 'exportContributionHistory',
                    'filterContributionHistory', 'generateContributionPayoutReport',
                    'exportContributionPayoutReport'],
                'reports.html': ['generateReports', 'setReportPeriod', 'exportReportPDF',
                    'exportReportExcel', 'printReport'],
                'settings.html': ['backupData', 'restoreData', 'clearAllData', 'saveToken',
                    'removeToken', 'toggleAutoBackup', 'restoreFromCloud', 'checkForUpdates']
            };
            for (const [page, names] of Object.entries(map)) {
                for (const name of names) {
                    if (typeof window[name] === 'undefined') window[name] = goto(page);
                }
            }
        })();

        document.addEventListener('DOMContentLoaded', () => Dashboard.init());
    </script>

    <!-- Service Worker Registration -->
    <script src="shared/sw-register.js"></script>
</body>
</html>
`;

const out = partA + '\n' + partB + '\n' + partC;
writeFileSync('index.html', out);
console.log('index.html rebuilt:', out.split('\n').length, 'lines (was', orig.length + ')');
