/**
 * Simulate Client A (R3k / 3mo) and Client B (R3k / 1mo):
 * both pay R900 on each month's 30th until cleared, then print
 * reloan bylaws advice for requesting the same amount again.
 *
 * Run: node scripts/simulate-reloan-ab.mjs
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');
globalThis.Calculations = C;

const GRACE = 3;
const PAY_AMOUNT = 900;

function money(n) {
  return C.formatCurrency(C.round(n));
}

function interestCapRemainingFor(loan, opts) {
  const maxAllowed = C.getMaxInterestAllowed
    ? C.getMaxInterestAllowed(loan, opts)
    : (Number.isFinite(loan.max_interest_allowed) ? loan.max_interest_allowed : Infinity);
  return Math.max(0, maxAllowed - (loan.interest_paid || 0));
}

function getEntryEffectiveDues(entry, opts) {
  const paid = (entry && entry.paid_breakdown) || {};
  const eff = (due, done) => Math.max(0, (Number(due) || 0) - (Number(done) || 0));
  const extraAssessed = Math.max(
    Number(entry && entry.extra_admin_assessed) || 0,
    Number(opts && opts.extraAdminAssessedCandidate) || 0
  );
  const extraInterestAssessed = Math.max(
    Number(entry && entry.extra_interest_assessed) || 0,
    Number(opts && opts.extraInterestAssessedCandidate) || 0
  );
  const adminDue = (Number(entry && entry.admin_fee) || 0) + extraAssessed;
  const interestDue = (Number(entry && entry.interest_payment) || 0) + extraInterestAssessed;
  return {
    initiation_fee: eff(entry.initiation_fee, paid.initiation),
    admin_fee: eff(adminDue, paid.admin),
    interest_payment: eff(interestDue, paid.interest),
    principal_payment: eff(entry.principal_payment, paid.principal)
  };
}

function buildLoan({ id, account, name, principal, term, startYear, startMonthIndex }) {
  const quote = C.calculateStandardLoan(principal, term);
  const caps = C.addInterestCapFields({
    principal,
    term,
    totalInterest: quote.totalInterest
  });
  const schedule = quote.breakdown.map((item) => {
    const due = C.calculateDueDate(startYear, startMonthIndex, item.month);
    return {
      payment_number: item.month,
      due_date: due.toISOString(),
      monthly_payment: item.totalPayment,
      principal_payment: item.principal,
      interest_payment: item.interest,
      admin_fee: item.adminFee,
      initiation_fee: item.initiationFee,
      outstanding_balance: item.outstandingBalance,
      status: 'pending',
      amount_paid: 0,
      paid_breakdown: {}
    };
  });
  return {
    loan_id: id,
    client_name: name,
    account_number: account,
    principal_amount: principal,
    original_principal: principal,
    remaining_principal: principal,
    term_months: term,
    monthly_payment: quote.monthlyPayment,
    payments_made: 0,
    total_cost: quote.totalCost,
    current_balance: quote.totalCost,
    total_interest: quote.totalInterest,
    total_initiation_fee: quote.totalInitiationFee,
    initiation_fee_paid: 0,
    interest_paid: 0,
    total_principal_received: 0,
    loan_type: 'standard',
    status: 'active',
    created_at: new Date(startYear, startMonthIndex, 1, 12).toISOString(),
    disbursement_date: `${startYear}-${String(startMonthIndex + 1).padStart(2, '0')}-01`,
    start_month_index: startMonthIndex,
    schedule,
    payment_history: [],
    ...caps
  };
}

/** nth payment date: day 30 of calendar month, clamped to month length. */
function paymentDateForIndex(startYear, startMonthIndex, index) {
  const d = new Date(startYear, startMonthIndex + index, 1, 12);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(30, last));
  return d;
}

function applyPayment(loan, amount, paymentDate) {
  let nextPayment = loan.schedule.find(p => p.status === 'pending' || p.status === 'partial');
  if (!nextPayment) return { done: true };

  const nextDueDate = new Date(nextPayment.due_date);
  const expectedPayment = Number(nextPayment.monthly_payment) || loan.monthly_payment;
  const feeAssess = C.assessOpenInstallmentFees(loan, nextPayment, paymentDate, GRACE);

  if (feeAssess.latePenaltyAssessedCandidate > 0) {
    nextPayment.late_penalty_assessed = Math.max(
      Number(nextPayment.late_penalty_assessed) || 0,
      feeAssess.latePenaltyAssessedCandidate
    );
  }
  const alreadyPaidPenalty = Number((nextPayment.paid_breakdown || {}).late_penalty) || 0;
  const latePenalty = Math.max(
    0,
    (Number(nextPayment.late_penalty_assessed) || 0) - alreadyPaidPenalty
  );

  if (feeAssess.extraAdminAssessedCandidate > 0) {
    nextPayment.extra_admin_assessed = Math.max(
      Number(nextPayment.extra_admin_assessed) || 0,
      feeAssess.extraAdminAssessedCandidate
    );
  }

  if (feeAssess.extraInterestAssessedCandidate > 0) {
    const fullCandidate = feeAssess.extraInterestAssessedCandidate;
    const paidInterest = Number((nextPayment.paid_breakdown || {}).interest) || 0;
    const scheduledInterest = Number(nextPayment.interest_payment) || 0;
    const unpaidScheduledInterest = Math.max(
      0,
      scheduledInterest - Math.min(paidInterest, scheduledInterest)
    );
    const paidTowardExtra = Math.max(0, paidInterest - Math.min(paidInterest, scheduledInterest));
    const capForExtra = Math.max(
      0,
      interestCapRemainingFor(loan, {
        openEntry: nextPayment,
        openLiveExtraInterest: fullCandidate
      }) - unpaidScheduledInterest
    );
    const claimableInTotal = Math.min(fullCandidate, paidTowardExtra + capForExtra);
    C.applyExtraInterestAssessment(loan, nextPayment, fullCandidate, claimableInTotal);
  }

  const alloc = C.allocateScheduledPayment(amount, {
    entry: getEntryEffectiveDues(nextPayment, {
      extraAdminAssessedCandidate: nextPayment.extra_admin_assessed,
      extraInterestAssessedCandidate: nextPayment.extra_interest_assessed
    }),
    latePenaltyDue: latePenalty,
    interestCapRemaining: interestCapRemainingFor(loan),
    remainingPrincipal: loan.remaining_principal
  });

  let {
    initiationPaid: initiationFeePaid,
    adminPaid: adminFeePaid,
    penaltyPaid: latePenaltyPaid,
    interestPaid,
    principalPaid,
    unallocated: remainingAmount
  } = alloc;

  // Overpayment handling (mirror active-loans first/second half)
  if (remainingAmount > 0 && loan.remaining_principal > principalPaid) {
    const halfwayPoint = Math.ceil(loan.term_months / 2);
    const basePrincipal = loan.original_principal || loan.principal_amount;
    const principalPerMonth = basePrincipal / Math.max(1, loan.term_months);
    const principalAlreadySettled = Math.max(0, basePrincipal - loan.remaining_principal);
    const currentPaymentNumber = Math.floor(principalAlreadySettled / Math.max(0.01, principalPerMonth)) + 1;

    if (currentPaymentNumber <= halfwayPoint) {
      const additionalPrincipal = Math.min(remainingAmount, loan.remaining_principal - principalPaid);
      principalPaid += additionalPrincipal;
      remainingAmount -= additionalPrincipal;
    } else {
      const remainingInitiationFee = Math.max(
        0,
        (loan.total_initiation_fee || 0) - (loan.initiation_fee_paid || 0) - initiationFeePaid
      );
      if (remainingAmount > 0 && remainingInitiationFee > 0) {
        const extraInitiation = Math.min(remainingAmount, remainingInitiationFee);
        initiationFeePaid += extraInitiation;
        remainingAmount -= extraInitiation;
      }
      const capLeft = Math.max(
        0,
        interestCapRemainingFor(loan, {
          openEntry: nextPayment,
          openLiveExtraInterest: Number(nextPayment.extra_interest_assessed) || 0
        }) - interestPaid
      );
      if (remainingAmount > 0 && capLeft > 0) {
        const extraInterest = Math.min(remainingAmount, capLeft);
        interestPaid += extraInterest;
        remainingAmount -= extraInterest;
      }
      if (remainingAmount > 0) {
        const additionalPrincipal = Math.min(remainingAmount, loan.remaining_principal - principalPaid);
        principalPaid += additionalPrincipal;
        remainingAmount -= additionalPrincipal;
      }
    }
  }

  const pb = nextPayment.paid_breakdown = nextPayment.paid_breakdown || {};
  pb.initiation = C.round((pb.initiation || 0) + initiationFeePaid);
  pb.admin = C.round((pb.admin || 0) + adminFeePaid);
  pb.interest = C.round((pb.interest || 0) + interestPaid);
  pb.principal = C.round((pb.principal || 0) + principalPaid);
  pb.late_penalty = C.round((pb.late_penalty || 0) + latePenaltyPaid);
  nextPayment.payment_date = paymentDate.toISOString();
  nextPayment.amount_paid = C.round((nextPayment.amount_paid || 0) + amount);

  const duesLeft = getEntryEffectiveDues(nextPayment);
  const claimableInterestLeft = Math.min(
    duesLeft.interest_payment,
    Math.max(0, interestCapRemainingFor(loan) - interestPaid)
  );
  const latePenaltyLeft = Math.max(
    0,
    (Number(nextPayment.late_penalty_assessed) || 0) - (pb.late_penalty || 0)
  );
  const entryCovered = (duesLeft.initiation_fee + duesLeft.admin_fee +
    claimableInterestLeft + duesLeft.principal_payment + latePenaltyLeft) <= 0.01;
  nextPayment.status = entryCovered ? 'paid' : 'partial';

  loan.total_principal_received = (loan.total_principal_received || 0) + principalPaid;
  loan.remaining_principal = Math.max(0, C.round(loan.remaining_principal - principalPaid));
  loan.initiation_fee_paid = C.round((loan.initiation_fee_paid || 0) + initiationFeePaid);
  loan.interest_paid = C.round((loan.interest_paid || 0) + interestPaid);

  const paymentStatus = C.getPaymentStatus(
    paymentDate, nextDueDate, amount, expectedPayment, GRACE
  );
  const scheduleIndex = loan.schedule.indexOf(nextPayment);
  loan.payment_history.push({
    date: paymentDate.toISOString(),
    amount,
    principal: principalPaid,
    interest: interestPaid,
    admin_fee: adminFeePaid,
    initiation_fee: initiationFeePaid,
    late_penalty: latePenaltyPaid,
    payment_status: paymentStatus,
    due_date: nextDueDate.toISOString(),
    installment_index: scheduleIndex + 1,
    days_late: feeAssess.daysLate,
    remaining_principal_after: loan.remaining_principal
  });

  if (loan.remaining_principal <= 0.01) {
    // Mark remaining schedule paid / clear open dues when principal gone
    loan.schedule.forEach(e => {
      if (e.status === 'pending' || e.status === 'partial') e.status = 'paid';
    });
    loan.status = 'completed';
    loan.remaining_principal = 0;
  }

  return {
    done: loan.status === 'completed',
    paymentStatus,
    principalPaid,
    interestPaid,
    adminFeePaid,
    latePenaltyPaid,
    initiationFeePaid,
    installment: scheduleIndex + 1
  };
}

function simulate({ label, account, name, principal, term, startYear, startMonthIndex }) {
  const loan = buildLoan({
    id: account === 'A' ? 101 : 102,
    account,
    name,
    principal,
    term,
    startYear,
    startMonthIndex
  });
  const quote = C.calculateStandardLoan(principal, term);
  const rows = [];
  let i = 0;
  while (loan.status === 'active' && i < 36) {
    const payDate = paymentDateForIndex(startYear, startMonthIndex, i);
    const r = applyPayment(loan, PAY_AMOUNT, payDate);
    if (r.done && !loan.payment_history.length) break;
    const last = loan.payment_history[loan.payment_history.length - 1];
    rows.push({
      n: i + 1,
      date: payDate.toISOString().slice(0, 10),
      status: last.payment_status,
      inst: last.installment_index,
      amount: PAY_AMOUNT,
      principal: last.principal,
      interest: last.interest,
      admin: last.admin_fee,
      init: last.initiation_fee,
      late: last.late_penalty,
      remPrin: last.remaining_principal_after
    });
    i += 1;
    if (loan.status === 'completed') break;
  }

  // Totals collected
  const collected = loan.payment_history.reduce((acc, h) => {
    acc.cash += h.amount;
    acc.principal += h.principal;
    acc.interest += h.interest;
    acc.admin += h.admin_fee;
    acc.init += h.initiation_fee;
    acc.late += h.late_penalty;
    return acc;
  }, { cash: 0, principal: 0, interest: 0, admin: 0, init: 0, late: 0 });

  const client = {
    account_number: account,
    first_name: name.split(' ')[0],
    last_name: name.split(' ').slice(1).join(' ') || 'Client',
    status: 'active',
    total_loans: 1
  };
  const asOf = new Date(loan.payment_history[loan.payment_history.length - 1].date);
  asOf.setDate(asOf.getDate() + 1);
  const metrics = C.computeClientPaymentMetrics(client, [loan], {
    asOf,
    gracePeriodDays: GRACE
  });
  const adviceSame = C.buildReloanAdvice(client, [loan], {
    gracePeriodDays: GRACE,
    reloanBylaws: C.getDefaultReloanBylaws()
  }, {
    requestedPrincipal: principal,
    requestedTerm: term,
    asOf
  });
  const adviceReduced = C.buildReloanAdvice(client, [loan], {
    gracePeriodDays: GRACE,
    reloanBylaws: C.getDefaultReloanBylaws()
  }, {
    requestedPrincipal: C.round(principal * 0.5),
    requestedTerm: term,
    asOf
  });

  return {
    label,
    quote,
    loan,
    rows,
    collected,
    metrics,
    adviceSame,
    adviceReduced,
    months: rows.length,
    asOf
  };
}

function printSim(s) {
  console.log('\n' + '='.repeat(72));
  console.log(s.label);
  console.log('='.repeat(72));
  console.log(
    `Contract: ${money(s.loan.principal_amount)} / ${s.loan.term_months} mo · ` +
    `equalized due ${money(s.quote.monthlyPayment)} · ` +
    `period interest ${money(s.quote.totalInterest)} · ` +
    `2× cap ${money(s.quote.maxInterestAllowed)}`
  );
  console.log(`Behavior: pays ${money(PAY_AMOUNT)} on each month's 30th until principal clears.`);
  console.log('');
  console.log(
    '  #  Date        Status         Inst   Cash     Prin     Int    Admin   Late    RemPrin'
  );
  for (const r of s.rows) {
    console.log(
      String(r.n).padStart(3) + '  ' +
      r.date + '  ' +
      String(C.formatPaymentStatus(r.status)).padEnd(13) + '  ' +
      String(r.inst).padStart(4) + '  ' +
      money(r.amount).padStart(8) + '  ' +
      money(r.principal).padStart(8) + '  ' +
      money(r.interest).padStart(7) + '  ' +
      money(r.admin).padStart(7) + '  ' +
      money(r.late).padStart(7) + '  ' +
      money(r.remPrin).padStart(9)
    );
  }
  console.log('');
  console.log(
    `Cleared in ${s.months} payments · cash in ${money(s.collected.cash)} · ` +
    `principal ${money(s.collected.principal)} · interest ${money(s.collected.interest)} · ` +
    `admin ${money(s.collected.admin)} · initiation ${money(s.collected.init)} · ` +
    `late ${money(s.collected.late)}`
  );
  console.log(
    `Net to TBFS (cash − principal): ${money(s.collected.cash - s.collected.principal)} · ` +
    `interest_paid on loan: ${money(s.loan.interest_paid)} / cap ${money(s.loan.max_interest_allowed)}`
  );
  console.log(
    `Reliability at completion: score ${s.metrics.score} · band ${s.metrics.band.label}` +
    ` · late ${s.metrics.late_count} · partial ${s.metrics.partial_count}` +
    ` · clean streak ${s.metrics.redemption.clean_streak}`
  );

  console.log('\n--- Officer advice: SAME amount / same term reload ---');
  console.log(C.formatReloanAdviceForConfirm(s.adviceSame));
  console.log('\n--- Officer advice: 50% principal reload ---');
  console.log(
    `Requested ${money(s.adviceReduced.requested_principal)} · ` +
    `tier cap ${s.adviceReduced.max_allowed_principal != null
      ? money(s.adviceReduced.max_allowed_principal) : 'n/a'} · ` +
    `flags: ${(s.adviceReduced.flags || []).join(', ') || '(none)'} · ` +
    `severity ${s.adviceReduced.severity}`
  );
  console.log('Stance:', s.adviceReduced.stance, '·', s.adviceReduced.summary);
}

// Disburse after 31 Jan 2026 so late / delinquency fees are eligible.
const startYear = 2026;
const startMonthIndex = 1; // February start → first due end of Feb

const simA = simulate({
  label: 'LOAN A — Client A · R3,000 / 3 months',
  account: 'CLIENT-A',
  name: 'Client A',
  principal: 3000,
  term: 3,
  startYear,
  startMonthIndex
});

const simB = simulate({
  label: 'LOAN B — Client B · R3,000 / 1 month',
  account: 'CLIENT-B',
  name: 'Client B',
  principal: 3000,
  term: 1,
  startYear,
  startMonthIndex
});

printSim(simA);
printSim(simB);

console.log('\n' + '='.repeat(72));
console.log('SIDE-BY-SIDE RELOAD (request R3,000 again)');
console.log('='.repeat(72));
for (const s of [simA, simB]) {
  const a = s.adviceSame;
  console.log(
    `${s.label.split('—')[0].trim()}: score ${s.metrics.score} ${s.metrics.band.label}` +
    ` · stance ${a.stance} · severity ${a.severity}` +
    ` · same-amount allowed? ${a.tier.same_amount_allowed ? 'yes' : 'NO'}` +
    ` · tier cap ${a.max_allowed_principal != null ? money(a.max_allowed_principal) : 'n/a'}` +
    ` · flags [${(a.flags || []).join(', ')}]`
  );
}
console.log('');
