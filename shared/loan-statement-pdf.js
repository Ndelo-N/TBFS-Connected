/**
 * Render a TBFS LOAN STATEMENT PDF from buildLoanStatementModel output.
 * Requires window.jspdf (jsPDF UMD).
 */
function dbg(...args) { if (globalThis.TBFS_DEBUG) console.log(...args); }

const LoanStatementPDF = {
    /**
     * @param {object} model - from Calculations.buildLoanStatementModel
     * @param {object} [opts]
     * @returns {{ doc: object, filename: string }}
     */
    build(model, opts) {
        if (!model || !model.summary) throw new Error('Statement model required');
        if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF is not loaded');
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);
        let yPos = 20;
        const money = (n) => (typeof Calculations !== 'undefined' && Calculations.formatCurrency)
            ? Calculations.formatCurrency(n)
            : ('R ' + Number(n || 0).toFixed(2));
        const fmtDate = (v) => {
            if (!v) return '—';
            const d = new Date(v);
            if (isNaN(d.getTime())) return String(v);
            return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
        };
        const fmtDateTime = (v) => {
            if (!v) return '—';
            const d = new Date(v);
            if (isNaN(d.getTime())) return String(v);
            return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) +
                ' ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
        };

        function checkPageBreak(needed) {
            if (yPos + needed > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        }
        function writeWrapped(text, x, maxWidth, lineHeight) {
            if (text === null || text === undefined || text === '') return;
            String(text).split(/\r?\n/).forEach((block, idx, arr) => {
                const lines = doc.splitTextToSize(block, maxWidth);
                lines.forEach(line => {
                    checkPageBreak(lineHeight + 2);
                    doc.text(line, x, yPos);
                    yPos += lineHeight;
                });
                if (idx < arr.length - 1) yPos += 1;
            });
        }
        function sectionHeader(title) {
            checkPageBreak(20);
            doc.setFillColor(236, 240, 241);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(title, margin + 2, yPos + 5.5);
            yPos += 12;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
        }
        function kv(label, value, labelX, valueX) {
            checkPageBreak(6);
            doc.setFont('helvetica', 'bold');
            doc.text(label, labelX, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), valueX, yPos);
            yPos += 6;
        }

        const s = model.summary;
        const f = model.financials;
        const p = model.position;

        // Header
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('TBFS LOAN STATEMENT', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Loan #' + s.loan_id + ' - ' + (s.client_name || model.client_name || ''),
            pageWidth / 2, 30, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPos = 50;

        sectionHeader('LOAN SUMMARY');
        kv('Loan Type:', s.loan_type_label || s.loan_type, margin + 5, margin + 60);
        kv('Original Principal:', money(s.original_principal), margin + 5, margin + 60);
        kv('Term:', (s.term_months || 0) + ' months', margin + 5, margin + 60);
        kv('Monthly Payment:', money(s.monthly_payment), margin + 5, margin + 60);
        kv('Status:', String(s.status || '').toUpperCase(), margin + 5, margin + 60);
        kv('Created:', fmtDate(s.created_at), margin + 5, margin + 60);
        if (s.completion_date) kv('Completed:', fmtDate(s.completion_date), margin + 5, margin + 60);
        if (s.early_payoff) {
            kv('Early Payoff:', 'YES (Month ' + (s.payoff_month || '?') + ')', margin + 5, margin + 60);
            kv('Savings:', money(s.savings_from_early_payoff), margin + 5, margin + 60);
        }
        yPos += 4;

        sectionHeader('FINANCIAL BREAKDOWN');
        kv('Original Principal:', money(f.original_principal), margin + 5, margin + 60);
        kv('Total Interest:', money(f.total_interest), margin + 5, margin + 60);
        kv('Initiation Fee:', money(f.initiation_fee), margin + 5, margin + 60);
        kv('Admin (scheduled):', money(f.admin_scheduled), margin + 5, margin + 60);
        if (Number(f.admin_extra_assessed) > 0) {
            kv('Admin (extra post-grace):', money(f.admin_extra_assessed), margin + 5, margin + 60);
        }
        kv('Admin total:', money(f.admin_total), margin + 5, margin + 60);
        if (Number(f.late_penalties_assessed) > 0) {
            kv('Late penalties:', money(f.late_penalties_assessed), margin + 5, margin + 60);
        }
        checkPageBreak(8);
        doc.line(margin + 55, yPos, margin + contentWidth - 5, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL LOAN COST:', margin + 5, yPos);
        doc.text(money(f.total_loan_cost), margin + 60, yPos);
        yPos += 8;
        if (s.interest_calculation_months) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('Interest Period: ' + s.interest_calculation_months + ' months', margin + 5, yPos);
            yPos += 5;
            if (s.interest_recalculated) {
                doc.setTextColor(231, 76, 60);
                doc.text('Interest recalculated due to early overpayment', margin + 5, yPos);
                yPos += 5;
                doc.text('New Max Interest: ' + money(s.max_interest_allowed), margin + 5, yPos);
                doc.setTextColor(0, 0, 0);
                yPos += 5;
            }
            doc.setFontSize(10);
        }
        yPos += 4;

        sectionHeader('CURRENT POSITION');
        kv('Contracted installment:', money(p.monthly_installment != null ? p.monthly_installment : s.monthly_payment), margin + 5, margin + 70);
        kv('Installment amount due:', money(p.installment_amount_due), margin + 5, margin + 70);
        if (p.installment_due_breakdown) {
            const b = p.installment_due_breakdown;
            doc.setFontSize(8);
            doc.setTextColor(90, 90, 90);
            writeWrapped(
                'Due now: P ' + money(b.principal) +
                ' | Interest ' + money(b.interest) +
                ' | Init ' + money(b.initiation_fee) +
                ' | Admin ' + money(b.admin) +
                (Number(b.late_penalty) > 0 ? ' | Penalty ' + money(b.late_penalty) : ''),
                margin + 5, contentWidth - 10, 3.5);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
        }
        if (s.interest_calculation_months) {
            kv('Interest period:',
                s.interest_calculation_months + ' of ' + (s.term_months || 0) + ' months',
                margin + 5, margin + 70);
        }
        kv('Payments Made:', (p.payments_made || 0) + ' of ' + (p.term_months || 0), margin + 5, margin + 70);
        kv('Payments Remaining:', String(p.payments_remaining || 0), margin + 5, margin + 70);
        kv('Progress:', (p.progress_pct || 0) + '%', margin + 5, margin + 70);
        yPos += 2;
        kv('Principal Paid:', money(p.principal_paid), margin + 5, margin + 70);
        kv('Principal Remaining:', money(p.principal_remaining), margin + 5, margin + 70);
        yPos += 2;
        kv('Interest Paid:', money(p.interest_paid), margin + 5, margin + 70);
        kv('Interest Remaining:', money(p.interest_remaining), margin + 5, margin + 70);
        yPos += 2;
        kv('Initiation Fee Paid:', money(p.initiation_fee_paid), margin + 5, margin + 70);
        kv('Initiation Fee Remaining:', money(p.initiation_fee_remaining), margin + 5, margin + 70);
        yPos += 2;
        kv('Admin Fees Paid:', money(p.admin_paid), margin + 5, margin + 70);
        kv('Admin Fees Remaining:', money(p.admin_remaining), margin + 5, margin + 70);
        if (Number(p.late_penalty_paid) > 0 || Number(p.late_penalty_remaining) > 0) {
            yPos += 2;
            kv('Late Penalties Paid:', money(p.late_penalty_paid), margin + 5, margin + 70);
            kv('Late Penalties Remaining:', money(p.late_penalty_remaining), margin + 5, margin + 70);
        }
        if (p.next_due_date) {
            yPos += 2;
            kv('Next due:', fmtDate(p.next_due_date), margin + 5, margin + 70);
            if (Number(p.days_past_grace) > 0) {
                kv('Days past grace:', String(p.days_past_grace), margin + 5, margin + 70);
            }
        }
        checkPageBreak(12);
        doc.line(margin + 65, yPos, margin + contentWidth - 5, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL PAID:', margin + 5, yPos);
        doc.text(money(p.total_paid), margin + 70, yPos);
        yPos += 6;
        doc.text('TOTAL REMAINING:', margin + 5, yPos);
        doc.text(money(p.total_remaining), margin + 70, yPos);
        yPos += 10;

        sectionHeader('ACTIVITY HISTORY');
        const activity = Array.isArray(model.activity) ? model.activity : [];
        if (!activity.length) {
            doc.setFont('helvetica', 'normal');
            doc.text('No activity recorded yet.', margin + 5, yPos);
            yPos += 8;
        } else {
            activity.forEach(item => {
                checkPageBreak(18);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(fmtDateTime(item.date), margin + 5, yPos);
                yPos += 5;
                doc.setFont('helvetica', 'normal');
                writeWrapped(item.title || item.type, margin + 10, contentWidth - 15, 4);
                if (item.detail) {
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    writeWrapped(item.detail, margin + 10, contentWidth - 15, 3.5);
                    doc.setFontSize(9);
                    doc.setTextColor(0, 0, 0);
                }
                if (Number(item.amount) > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Amount: ' + money(item.amount), margin + 10, yPos);
                    doc.setFont('helvetica', 'normal');
                    yPos += 4;
                }
                yPos += 3;
            });
        }
        yPos += 4;

        sectionHeader('PAYMENT SCHEDULE');
        const rows = Array.isArray(model.schedule) ? model.schedule : [];
        if (!rows.length) {
            doc.setFont('helvetica', 'normal');
            doc.text('No schedule on file.', margin + 5, yPos);
            yPos += 8;
        } else {
            doc.setFontSize(8);
            rows.forEach(row => {
                checkPageBreak(22);
                doc.setFont('helvetica', 'bold');
                doc.text(
                    '#' + row.index + '  Due ' + fmtDate(row.due_date) +
                    '  [' + String(row.status || '').toUpperCase() + ']',
                    margin + 5, yPos);
                yPos += 4;
                doc.setFont('helvetica', 'normal');
                writeWrapped(
                    'Installment: ' + money(row.monthly_payment != null ? row.monthly_payment : row.installment_total) +
                    (Number(row.amount_due) > 0.005 && String(row.status).toLowerCase() !== 'paid'
                        ? '  |  Still due: ' + money(row.amount_due)
                        : ''),
                    margin + 8, contentWidth - 12, 3.5);
                writeWrapped(
                    'Breakdown: P ' + money(row.principal) +
                    ' | Interest ' + money(row.interest) +
                    ' | Initiation ' + money(row.initiation_fee) +
                    ' | Admin ' + money(row.admin_fee),
                    margin + 8, contentWidth - 12, 3.5);
                if (Number(row.extra_admin_assessed) > 0 || Number(row.late_penalty_assessed) > 0) {
                    writeWrapped(
                        'Assessed: Extra admin ' + money(row.extra_admin_assessed) +
                        ' | Late penalty ' + money(row.late_penalty_assessed),
                        margin + 8, contentWidth - 12, 3.5);
                }
                if (Number(row.amount_paid) > 0 || row.payment_date) {
                    writeWrapped(
                        'Paid: ' + money(row.amount_paid) +
                        (row.payment_date ? ' on ' + fmtDate(row.payment_date) : ''),
                        margin + 8, contentWidth - 12, 3.5);
                }
                yPos += 2;
            });
            doc.setFontSize(10);
        }

        const pageCount = doc.internal.getNumberOfPages();
        const generated = model.generated_at || new Date().toISOString();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(128, 128, 128);
            doc.text('Generated: ' + fmtDateTime(generated), margin, pageHeight - 10);
            doc.text('Page ' + i + ' of ' + pageCount, pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.text('TBFS - Transparent, Fair, Simple', pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        const safeName = String(s.client_name || model.client_name || 'Client')
            .replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
        const filename = 'TBFS_Loan_Statement_' + (s.loan_id || 'loan') + '_' +
            safeName + '_' + new Date().toISOString().split('T')[0] + '.pdf';
        return { doc, filename };
    },

    download(model, opts) {
        const { doc, filename } = this.build(model, opts);
        if (/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            doc.save(filename);
        }
        return filename;
    }
};

if (typeof window !== 'undefined') {
    window.LoanStatementPDF = LoanStatementPDF;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoanStatementPDF;
}
