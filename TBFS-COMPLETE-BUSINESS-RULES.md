# TBFS Loan Management System - Complete Business Rules Documentation

**System Name:** TBFS (The Best Financial Services) - Enhanced Loan Management System  
**Version:** 1.7.0  
**Document Date:** 2025-10-31  
**Analysis Type:** Comprehensive Business Rules Extraction  
**Document Status:** Complete & Validated

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Loan Types & Structure](#loan-types--structure)
3. [Interest Calculation Rules](#interest-calculation-rules)
4. [Fee Structure Rules](#fee-structure-rules)
5. [Stockvel Member System Rules](#stockvel-member-system-rules)
6. [Bonus System Rules](#bonus-system-rules)
7. [Payment Processing Rules](#payment-processing-rules)
8. [Membership & Registration Rules](#membership--registration-rules)
9. [Due Date & Schedule Rules](#due-date--schedule-rules)
10. [Validation & Business Constraints](#validation--business-constraints)
11. [Data Management Rules](#data-management-rules)
12. [PWA & Technical Rules](#pwa--technical-rules)

---

## System Overview

### 1.1 Core Philosophy
- **Ethical Lending:** Dignity, No Harassment, Fair Rates
- **Transparency:** All calculations visible and documented
- **Member Benefits:** Stockvel members receive preferential treatment
- **Offline-First:** Works without internet connectivity
- **Data Privacy:** Local-first storage with optional cloud backup

### 1.2 System Architecture
- **Type:** Progressive Web App (PWA)
- **Storage:** localStorage primary, optional GitHub cloud backup
- **Technology:** Pure HTML/CSS/JavaScript (no frameworks)
- **Libraries:** jsPDF, SheetJS (xlsx), Chart.js

---

## Loan Types & Structure

### 2.1 Standard Loans

**Definition:** Regular loans for non-stockvel members

**Key Parameters:**
- **Interest Rate:** 15% per month (declining balance method)
- **Initiation Fee:** 9% of loan principal
- **Admin Fee:** R60 per month (fixed)
- **Minimum Loan:** No specified minimum
- **Maximum Loan:** No specified maximum
- **Term Length:** 1-24+ months

**Calculation Method:**
- Uses declining balance for interest
- Interest period = Math.ceil(term/2), minimum 3 months
- Interest period capped at actual loan term
- Monthly payment = (Principal + All Fees) / Term
- Equal monthly installments

**Income Table Method for 30% Loans:**
```
Monthly TBFS Income = Balance × 0.30
This includes: Interest + Admin Fee + Initiation Fee Portion
Interest = (Balance × 0.30) - Admin Fee - Initiation Portion
```

---

### 2.2 Stockvel Member Loans

**Definition:** Preferential loans for registered stockvel members with contributions

**Key Differentiators:**
- Tiered interest rates based on loan-to-savings ratio
- Reduced/waived initiation fees
- Variable admin fees
- Bonus system eligibility
- Membership expiry validation

**Eligibility Requirements:**
- Must be registered as stockvel member
- Must have active membership (not expired)
- Maximum loan term cannot exceed months until membership expiry

**Calculation Method:**
- Tiered calculation for Tiers 1-4
- Income Table method for Tier 5 (>110% of contributions)
- 10% minimum interest rule applies
- Bonus system activates when tiered rate < 10%

---

## Interest Calculation Rules

### 3.1 Standard Loan Interest

**Base Rate:** 15% per month

**Interest Calculation Period:**
```javascript
calculatedMonths = Math.ceil(term / 2) >= 3 ? Math.ceil(term / 2) : 3
interestPeriod = Math.min(calculatedMonths, term)
```

**Examples:**
- 1-month loan: 1 month of interest
- 2-month loan: 2 months of interest  
- 3-month loan: 3 months of interest
- 6-month loan: 3 months of interest
- 12-month loan: 6 months of interest

**Declining Balance Formula:**
```javascript
For each month in interest period:
  monthlyInterest = remainingBalance × 0.15
  remainingBalance -= (principal / term)
```

**Interest Cap:** 100% of principal amount (never exceeds original loan amount)

---

### 3.2 Stockvel Tiered Interest

**Tier Structure (Based on Absolute Amounts):**

| Tier | Range | Rate | Description |
|------|-------|------|-------------|
| Tier 1 | R0 - 30% of contributions | 3% | First R450 if R1,500 contributions |
| Tier 2 | 30% - 75% of contributions | 8% | Next R675 if R1,500 contributions |
| Tier 3 | 75% - 105% of contributions | 15% | Next R450 if R1,500 contributions |
| Tier 4 | 105% - 110% of contributions | 25% | Next R75 if R1,500 contributions |
| Tier 5 | >110% of contributions | 30% | Above R1,650 if R1,500 contributions |

**Tier Boundary Calculation:**
```javascript
tier1_max = totalContributions × 0.30
tier2_max = totalContributions × 0.75
tier3_max = totalContributions × 1.05
tier4_max = totalContributions × 1.10
tier5_start = tier4_max + 0.01
```

**Calculation Logic:**

**For Tiers 1-4:**
```javascript
tierAmount = Math.min(remainingLoan, tierBoundary)
tierInterest = tierAmount × tierRate
```

**For Tier 5 (>110%):**
Uses Income Table Method:
```javascript
tier5TotalCharge = tier5Amount × 0.30
tier5Proportion = tier5Amount / loanAmount
tier5ProportionalInitiation = monthlyInitiation × tier5Proportion
tier5ProportionalAdmin = adminFee × tier5Proportion
tier5Interest = tier5TotalCharge - tier5ProportionalInitiation - tier5ProportionalAdmin
```

**Admin Fee Calculation (Tiers 1-4 Only):**
```javascript
tiers1to4Rate = tiers1to4Interest / tier1to4Amount
adminFee = 60 × (1 - tiers1to4Rate)
```

**Key Principle:** Admin fee based ONLY on Tiers 1-4 effective rate, NOT including Tier 5. This breaks the circular dependency.

---

### 3.3 Interest Period Rules

**Standard Loans:**
- Interest charged for calculated period (Math.ceil(term/2), min 3)
- Spread evenly across all payment months

**Stockvel Loans:**
- **CRITICAL:** Interest charged for FULL loan term
- NOT half-term like standard loans
- Allows bonuses to accumulate throughout loan duration
- Later months = declining balance + rising contributions = bigger bonuses

**Rationale:** Full-term interest for stockvel members ensures:
- Consistent monthly payments
- Bonus accumulation over entire loan
- Rewards for consistent contribution behavior
- Fair treatment as contributions increase

---

### 3.4 10% Minimum Interest Rule (Stockvel Only)

**Rule:** If tiered interest rate is below 10%, apply 10% minimum

**Calculation:**
```javascript
tieredRate = totalTieredInterest / outstandingBalance
minimumRate = 0.10

if (tieredRate < minimumRate) {
    appliedInterest = outstandingBalance × 0.10
    bonusEarned = (minimumCharge) - (amountDueToTBFS)
} else {
    appliedInterest = totalTieredInterest
    bonusEarned = 0
}
```

**Minimum Charge Components:**
- Interest: balance × 0.10
- Admin: R60
- Initiation: monthlyInitiationFee

**Amount Due to TBFS:**
- Interest: tieredInterest
- Admin: 60 × (1 - tieredRate)
- Initiation: monthlyInitiationFee

**Bonus Calculation:**
```javascript
if (amountDueToTBFS < minimumCharge) {
    bonus = minimumCharge - amountDueToTBFS
    memberPays = minimumCharge
} else {
    bonus = 0
    memberPays = amountDueToTBFS
}
```

**Key Insight:** Members pay the higher of (tiered rate OR 10% minimum), earning bonuses when tiered rate is favorable.

---

## Fee Structure Rules

### 4.1 Initiation Fees

**Standard Loans:**
- **Rate:** 9% of principal amount
- **Application:** Charged once at loan origination
- **Distribution:** Spread evenly across all payment months
- **Formula:** `initiationFee = principal × 0.09`
- **Monthly Portion:** `initiationFee / term`

**Stockvel Loans:**
- **Waiver Zone:** Up to contribution amount = R0 initiation fee
- **Charged Zone:** Excess above contributions = 12% initiation fee
- **Formula:**
```javascript
if (principal > totalContributions) {
    excessAmount = principal - totalContributions
    initiationFee = excessAmount × 0.12
} else {
    initiationFee = 0  // Fully waived
}
monthlyInitiation = initiationFee / term
```

**Example (R3,000 loan, R1,500 contributions):**
```
Waived: R0 - R1,500 (no fee)
Charged: R1,500 - R3,000 at 12%
Total Initiation: (R3,000 - R1,500) × 0.12 = R180
Monthly (1 month): R180 / 1 = R180
```

**Critical Rules:**
1. Zone logic applied ONCE at loan origination
2. Monthly portion allocated proportionally to tiers (if using Income Table)
3. No re-checking of zones during tier calculations
4. Waiver based on contributions at loan START, not current contributions

---

### 4.2 Admin Fees

**Standard Loans:**
- **Amount:** R60 per month (fixed)
- **Application:** Every month of loan term
- **No variation:** Same regardless of loan amount or balance

**Stockvel Loans:**
- **Variable Amount:** Based on tiered interest rate
- **Formula:** `adminFee = 60 × (1 - effectiveRate)`
- **Effective Rate:** Based on Tiers 1-4 ONLY (not Tier 5)

**Calculation Example:**
```
Tiers 1-4 Interest: R153.75
Tiers 1-4 Amount: R1,650
Effective Rate: R153.75 / R1,650 = 9.318%
Admin Fee: R60 × (1 - 0.09318) = R54.41
```

**Admin Fee Range:**
- Maximum: R60 (when tiered rate = 0%, lowest loans)
- Minimum: R42 (when tiered rate = 30%, highest loans)
- Lower interest rate → Higher admin fee
- Higher interest rate → Lower admin fee

**Rationale:** Rewards members with good loan-to-savings ratios

---

### 4.3 Late Payment Penalties

**Standard Rule:**
- **Rate:** 0.1% per day late
- **Maximum:** 7 days of penalties
- **Cap:** Penalties cannot exceed reasonable limits

**Calculation:**
```javascript
daysLate = Math.max(0, daysSinceLastPayment - 30)
latePenalty = Math.min(daysLate, 7) × 0.001 × outstandingBalance
```

**Application:**
- Only applies to overdue loans
- Calculated when payment is made
- Added to total amount due
- Tracked separately in transaction history

---

### 4.4 Early Payoff Discount

**Rule:** 20% discount on remaining interest for early full payoff

**Eligibility:**
- Must pay off entire remaining principal
- Must be before final scheduled payment
- Discount applies to unpaid interest only

**Calculation:**
```javascript
remainingInterest = maxInterestAllowed - totalInterestCharged
discountedInterest = remainingInterest × 0.80
finalPayment = remainingPrincipal + discountedInterest + fees
```

**Example:**
```
Remaining Principal: R2,000
Remaining Interest: R500
Discount: R500 × 0.20 = R100
Early Payoff Amount: R2,000 + R400 + fees = R2,400 + fees
```

---

## Stockvel Member System Rules

### 5.1 Member Registration

**Registration Requirements:**
- Full Name (required)
- Phone Number (required)
- Email Address (optional)
- Membership Start Date (required)
- Monthly Contribution Amount (required)
- Initial Contribution (optional)

**Auto-Generated Fields:**
- Member Number: Auto-increments from 1001
- Membership End Date: Start date + 12 months
- Registered Date: Current timestamp
- Status: 'active' by default

**Member Number System:**
- Starts at 1001
- Increments by 1 for each new member
- Never reused (even if member deleted)
- Unique identifier across system

**Storage:**
- Stored in `AppState.stockvelMembers` array
- **Completely separate from `AppState.clients` array**
- Independent of loan system
- Can exist without any loans

---

### 5.2 Member Data Structure

**Member Object:**
```javascript
{
    memberNumber: 1001,                     // Unique ID
    name: "Full Name",                      // Required
    phone: "0821234567",                    // Required
    email: "email@example.com",             // Optional
    membershipStartDate: "2025-10-11",      // Required
    membershipEndDate: "2026-10-11",        // Auto-calculated
    monthlyContribution: 500.00,            // Required
    totalContributions: 2500.00,            // Accumulates over time
    accumulatedBonus: 150.00,               // Separate from contributions
    registeredDate: "2025-10-11T08:00:00",  // Timestamp
    status: "active"                        // active/inactive/expired
}
```

**Key Principles:**
1. `totalContributions` = Pure contributions only (NOT including bonuses)
2. `accumulatedBonus` = Bonuses earned (tracked separately)
3. Member can exist without taking loans
4. Member can contribute without loans
5. Bonuses NEVER added to totalContributions

---

### 5.3 Membership Status Rules

**Status Types:**
- **Active:** Current membership, not expiring soon
- **Soon:** Expires in 8-30 days
- **Urgent:** Expires in 1-7 days
- **Expired:** Past membership end date

**Status Display:**
- ✅ Active: Green badge
- ⏰ Soon: Yellow badge
- ⚠️ Urgent: Orange badge
- ⛔ Expired: Red badge

**Membership Renewal:**
- Can renew at any time
- Extends end date by 12 months from current end date
- One-click renewal process
- Status updates automatically

**Alerts:**
- System checks for renewals within 30 days
- Displays in "Membership Renewal Alerts" section
- Shows days remaining
- Provides renewal button

---

### 5.4 Membership Expiry Validation

**Loan Term Restriction:**
```javascript
monthsUntilExpiry = calculateMonthsBetween(today, membershipEndDate)
maxLoanTerm = monthsUntilExpiry
```

**Validation Rule:** Maximum loan term CANNOT exceed months until membership expires

**Examples:**
- Membership expires in 3 months → Maximum 3-month loan
- Membership expires in 6 months → Maximum 6-month loan
- Membership expired → Cannot issue new loans

**Error Handling:**
```
"Cannot issue a X-month loan. Membership expires in Y months.
Please renew membership or select a shorter loan term."
```

**Purpose:** Prevents loans from outlasting membership period

---

### 5.5 Contribution Tracking

**Contribution Types:**
1. **Initial Contribution:** Set at registration
2. **Monthly Contributions:** Regular deposits
3. **Adjustments:** Manual corrections (positive or negative)
4. **Loan Payments:** Do NOT increase contributions (bonuses separate)

**Receipt Recording:**
```javascript
{
    id: timestamp,
    memberNumber: 1001,
    memberName: "John Doe",
    type: "contribution | loan_payment | bonus_payout | adjustment",
    amount: 500.00,
    date: "2025-10-11",
    notes: "Optional description",
    previousTotal: 2000.00,
    newTotal: 2500.00,
    bonusAmount: 0  // Only for loan_payment type
}
```

**Type Behaviors:**
- **contribution:** Increases totalContributions
- **loan_payment:** Increases accumulatedBonus (NOT totalContributions)
- **bonus_payout:** Decreases accumulatedBonus
- **adjustment:** Can increase/decrease totalContributions

---

### 5.6 Linking Members to Loans

**Loan Object Fields:**
```javascript
{
    // ... standard loan fields ...
    isStockvelLoan: true,           // Flag
    memberNumber: 1001,             // Link to member
    tieredRate: 0.0485,             // Store for bonus calculation
    totalContributions: 10500.00,   // Snapshot at loan creation
    // ...
}
```

**Linking Process:**
1. Member takes loan
2. System finds member by memberNumber
3. Snapshots current totalContributions
4. Stores memberNumber in loan object
5. Loan can reference member for payments

**Payment Processing:**
1. Find loan by loan_id
2. If memberNumber exists, find member
3. Calculate bonus
4. Update member.accumulatedBonus
5. DO NOT update member.totalContributions

---

## Bonus System Rules

### 6.1 Bonus Calculation Formula

**Core Formula:**
```javascript
amountDueToTBFS = tieredInterest + adminFee + initiationFee
minimumCharge = balance × 0.10

if (amountDueToTBFS < minimumCharge) {
    memberPays = minimumCharge      // Exactly 10%
    bonus = minimumCharge - amountDueToTBFS
} else {
    memberPays = amountDueToTBFS    // Tiered amount
    bonus = 0                        // No bonus
}
```

**Minimum Charge Breakdown:**
```javascript
minimumInterest = balance × 0.10
minimumAdmin = 60
minimumInitiation = monthlyInitiationFee
minimumCharge = minimumInterest + minimumAdmin + minimumInitiation
```

**Amount Due to TBFS:**
```javascript
tieredInterest = (calculated from tier structure)
variableAdmin = 60 × (1 - tieredRate)
monthlyInitiation = (calculated once at start)
amountDueToTBFS = tieredInterest + variableAdmin + monthlyInitiation
```

---

### 6.2 Bonus Tracking & Storage

**Storage Location:**
- **Member Object:** `member.accumulatedBonus` field
- **Receipt Records:** `stockvelReceipts` array with bonusAmount
- **Loan Records:** Bonus calculations logged but not stored in loan

**Accumulation Rules:**
1. Bonuses calculated on each payment
2. Added to `accumulatedBonus` immediately
3. NOT added to `totalContributions`
4. Can accumulate over multiple payments
5. Can be paid out at any time

**Example Flow:**
```
Initial: totalContributions = R10,000, accumulatedBonus = R0

Month 1 Payment:
  Bonus earned: R200
  New: totalContributions = R10,000, accumulatedBonus = R200

Month 2 Payment:
  Bonus earned: R180
  New: totalContributions = R10,000, accumulatedBonus = R380

Bonus Payout:
  Payout: R380
  New: totalContributions = R10,000, accumulatedBonus = R0
```

**Key Principle:** Contributions and bonuses NEVER mix

---

### 6.3 Bonus Surprise Feature

**Implementation:** Bonuses hidden from members until revealed in statements

**What's Hidden:**
- Loan calculator: Bonus amounts not displayed
- Loan PDFs: Bonus information commented out
- Agreement forms: No bonus disclosure
- Member view: Generic "Special Member Benefits" message

**What's Visible (Internal Only):**
- Stockvel tab: Full bonus tracking
- Receipt records: Bonus amounts
- Admin reports: Bonus summaries
- Payment confirmations (TBFS only): Bonus earned

**Revelation Method:**
- Member Disbursement Statement PDF
- Generated at membership renewal (30-day mark)
- Can be generated any time by TBFS
- Shows current month bonuses with surprise message

**Surprise Message:**
```
"🎁 Surprise! You earned R257.50 in bonuses!

These bonuses have been added to your accumulated rewards
from making consistent loan payments with high contributions."
```

**Purpose:**
- Creates surprise and delight
- Increases member loyalty
- Provides unexpected positive experience
- Rewards consistent behavior
- Builds trust through transparency (when revealed)

---

### 6.4 Bonus Payout Rules

**Payout Methods:**
1. Manual payout via Stockvel tab
2. Deducted from accumulatedBonus
3. Recorded as "bonus_payout" receipt
4. Does NOT affect totalContributions

**Payout Process:**
```javascript
1. Select member
2. View accumulatedBonus balance
3. Click "💰 Payout" button
4. Enter payout amount (up to accumulatedBonus)
5. System creates receipt:
   {
     type: 'bonus_payout',
     amount: payoutAmount,
     previousBonus: oldBonus,
     newBonus: oldBonus - payoutAmount
   }
6. Member receives cash/transfer
```

**Payout Constraints:**
- Cannot payout more than accumulatedBonus
- Payout must be positive amount
- accumulatedBonus cannot go negative
- totalContributions unchanged by payout

---

### 6.5 Bonus Reporting

**Bonus Report Contents:**
- Member name and number
- Total bonuses earned (lifetime)
- Bonuses paid out (total)
- Pending bonuses (accumulatedBonus)
- Last bonus date
- Payout button

**Report Generation:**
- On-demand in Stockvel tab
- Filterable by member
- Exportable to Excel
- Shows all members with bonuses > 0

**Member Disbursement Statement:**
- Professional PDF format
- Member information section
- Current month activity (with bonus reveal)
- Transaction history (last 10)
- Bonus explanation
- Generated at renewal time or on-demand

---

## Payment Processing Rules

### 7.1 Payment Allocation Waterfall

**Allocation Order (Sequential):**
```
1. Admin Fee (R60 or variable)
2. Initiation Fee (monthly portion)
3. Interest (remaining after caps)
4. Principal (remainder)
```

**Allocation Logic:**
```javascript
let remaining = paymentAmount

// 1. Admin Fee
const adminPaid = Math.min(remaining, adminFeeDue)
remaining -= adminPaid

// 2. Initiation Fee
const initiationPaid = Math.min(remaining, initiationFeeDue)
remaining -= initiationPaid

// 3. Interest (with cap)
const maxInterestCanPay = maxInterestAllowed - totalInterestPaid
const interestPaid = Math.min(remaining, maxInterestCanPay)
remaining -= interestPaid

// 4. Principal
const principalPaid = remaining
```

**Key Rules:**
- Fees always paid first
- Interest capped at maximum allowed
- Excess goes to principal
- Order never changes

---

### 7.2 Payment Amount Handling

**Full Payment:**
- Amount = Expected monthly payment
- Follows standard allocation
- Moves to next month schedule

**Partial Payment:**
- Amount < Expected monthly payment
- Allocates via waterfall
- Loan remains in current month
- Balance reduced by principal paid

**Overpayment:**
- Amount > Expected monthly payment
- Allocates current month fees/interest
- Excess goes to principal
- Can pay off early

**Early Payoff:**
- Amount = Remaining principal + discounted interest + fees
- 20% discount on remaining interest
- Closes loan immediately
- Updates status to "completed"

---

### 7.3 Due Date Management

**Due Date Calculation Rule:** Last day of selected start month

**Formula:**
```javascript
// Get last day of month
targetYear = startYear + Math.floor((startMonth + monthOffset) / 12)
targetMonth = (startMonth + monthOffset) % 12
lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
dueDate = new Date(targetYear, targetMonth, lastDayOfMonth)
```

**Examples:**
```
Loan Date: Oct 7, 2025
Start Month: November

Payment 1: November 30, 2025 (last day of Nov)
Payment 2: December 31, 2025 (last day of Dec)
Payment 3: January 31, 2026 (last day of Jan)
```

**Month-End Handling:**
- February: 28 or 29 (leap year aware)
- 30-day months: Day 30
- 31-day months: Day 31
- Automatically adjusts for month length

**Year Rollover:**
- Correctly handles Dec → Jan transitions
- Increments year appropriately
- Maintains day-of-month-end logic

---

### 7.4 Bonus Processing on Payment

**Automatic Bonus Calculation (Stockvel Only):**

When "Make Payment" button clicked:
```javascript
if (loan.isStockvelLoan && loan.memberNumber) {
    // Find member
    member = findMember(loan.memberNumber)
    
    // Calculate bonus
    amountDueToTBFS = interestPaid + adminFeePaid + initFeePaid
    minimumCharge = remainingBalance × 0.10
    
    if (amountDueToTBFS < minimumCharge) {
        bonusEarned = minimumCharge - amountDueToTBFS
        member.accumulatedBonus += bonusEarned
        // member.totalContributions UNCHANGED
    }
    
    // Show confirmation
    alert(`Bonus Earned: R${bonusEarned.toFixed(2)}
           Total Accumulated: R${member.accumulatedBonus.toFixed(2)}`)
}
```

**Payment Confirmation Display:**
```
💰 Payment Processed!

📊 Breakdown:
• Principal: R1,000.00
• Interest: R242.50
• Admin Fee: R57.09
• Initiation Fee: R0.00

🎁 Stockvel Member Bonus:
• Bonus Earned: R200.41
• Total Accumulated: R200.41
• (Paid 10% minimum, saved 40.1%)

📈 Loan Status:
• Remaining Principal: R4,000.00
```

---

### 7.5 Payment Recording

**Transaction Log Entry:**
```javascript
{
    id: timestamp,
    type: 'payment',
    loan_id: loanId,
    date: paymentDate,
    amount: totalPaymentAmount,
    principal_paid: principalPaid,
    interest_paid: interestPaid,
    admin_fee_paid: adminFeePaid,
    initiation_fee_paid: initiationFeePaid,
    bonus_earned: bonusEarned,  // Stockvel only
    remaining_balance: newBalance,
    notes: "Payment received"
}
```

**Loan Update:**
```javascript
loan.remaining_principal -= principalPaid
loan.initiation_fee_paid += initiationFeePaid
loan.total_interest_charged += interestPaid
loan.payments_made += 1
loan.last_payment_date = paymentDate

if (loan.remaining_principal <= 0) {
    loan.status = 'completed'
    loan.completion_date = paymentDate
}
```

**Dashboard Update:**
```javascript
AppState.capital += principalPaid  // Return capital
AppState.deployedCapital -= principalPaid
AppState.totalInterestEarned += interestPaid
AppState.totalFeesEarned += (adminFeePaid + initiationFeePaid)
AppState.totalProfit += (interestPaid + adminFeePaid + initiationFeePaid)
```

---

### 7.6 Undo Payment Feature

**Capability:** Reverse last payment on a loan

**Process:**
```javascript
1. Find last transaction for loan
2. Reverse all amounts:
   - Add back principal to loan balance
   - Subtract interest from totals
   - Subtract fees from totals
   - Reverse bonus (if stockvel)
3. Update dashboard metrics
4. Decrement payments_made counter
5. Remove transaction from history
```

**Constraints:**
- Can only undo LAST payment
- Cannot undo if subsequent payment made
- Cannot undo if loan completed and new loan issued
- Requires confirmation

**Bonus Reversal (Stockvel):**
```javascript
if (loan.isStockvelLoan && transaction.bonus_earned > 0) {
    member.accumulatedBonus -= transaction.bonus_earned
    // Ensure doesn't go negative
    member.accumulatedBonus = Math.max(0, member.accumulatedBonus)
}
```

---

## Membership & Registration Rules

### 8.1 Client Registration (Standard)

**Required Fields:**
- Account Number (unique identifier)
- First Name
- Last Name
- Client Type: "standard" or "stockvel_member"

**Optional Fields:**
- Total Contributions (for stockvel type)
- Monthly Contribution (for stockvel type)

**Client Object:**
```javascript
{
    account_number: "2025001",
    first_name: "John",
    last_name: "Doe",
    client_type: "standard",
    status: "active",  // active/inactive/defaulted/blacklisted
    total_loans: 0,
    total_borrowed: 0,
    outstanding_balance: 0,
    created_date: timestamp
}
```

**Validation Rules:**
- Account number must be unique
- Account number cannot be empty
- Names cannot be empty
- Client type must be valid option

---

### 8.2 Stockvel Member Registration

**Dedicated Registration (Separate from Clients):**

**Required Fields:**
- Full Name
- Phone Number
- Monthly Contribution Amount
- Membership Start Date

**Optional Fields:**
- Email Address
- Initial Contribution

**Auto-Generated:**
- Member Number (1001, 1002, 1003...)
- Membership End Date (start + 12 months)
- Registered Date (timestamp)
- Status ('active')
- Accumulated Bonus (0)

**Registration Process:**
```javascript
1. User fills form in Stockvel tab
2. System generates memberNumber
3. System calculates membershipEndDate
4. System creates member object
5. If initial contribution > 0:
   - Set totalContributions = initial
   - Create receipt record
6. Add to stockvelMembers array
7. Save to localStorage
8. Display in member registry
```

**Membership Number Generation:**
```javascript
nextMemberNumber = AppState.nextMemberNumber || 1001
memberNumber = nextMemberNumber
AppState.nextMemberNumber = nextMemberNumber + 1
```

---

### 8.3 Member Status Management

**Status Calculation:**
```javascript
today = new Date()
endDate = new Date(member.membershipEndDate)
daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))

if (daysRemaining < 0) {
    status = 'expired'
    badge = '⛔ Expired'
    color = 'red'
} else if (daysRemaining <= 7) {
    status = 'urgent'
    badge = '⚠️ Urgent'
    color = 'orange'
} else if (daysRemaining <= 30) {
    status = 'soon'
    badge = '⏰ Soon'
    color = 'yellow'
} else {
    status = 'active'
    badge = '✅ Active'
    color = 'green'
}
```

**Status Display:**
- Shows in member registry table
- Color-coded badges
- Days remaining indicator
- Renewal button for expiring members

---

### 8.4 Membership Renewal

**Renewal Process:**
```javascript
1. Click "🔄 Renew Membership" button
2. System gets current endDate
3. Extend: newEndDate = oldEndDate + 12 months
4. Update member.membershipEndDate
5. Recalculate status
6. Save changes
7. Show confirmation
```

**Renewal Formula:**
```javascript
currentEnd = new Date(member.membershipEndDate)
newEnd = new Date(
    currentEnd.getFullYear() + 1,
    currentEnd.getMonth(),
    currentEnd.getDate()
)
member.membershipEndDate = newEnd.toISOString().split('T')[0]
```

**Renewal Rules:**
- Can renew at any time (even if not expiring soon)
- Always extends from current end date (not today)
- Always adds exactly 12 months
- Updates status immediately
- No fee charged (manual process)

**Renewal Alerts:**
- System shows members expiring within 30 days
- Alert section at top of Stockvel tab
- Shows days remaining
- Provides one-click renewal
- Can generate disbursement statement

---

## Due Date & Schedule Rules

### 9.1 Loan Start Month

**Rule:** User selects start month for first payment

**Available Months:**
- Generated dynamically for next 12 months
- Format: "MonthName Year" (e.g., "November 2025")
- Stored as index (0-11) in loan object

**Start Month Selection:**
```javascript
startMonthIndex = selectedMonthIndex
loan.start_month_index = startMonthIndex
```

**Purpose:**
- Allows flexibility in first payment timing
- Loan disbursed today, first payment next month (or later)
- Aligns with member's financial cycles

---

### 9.2 Payment Due Date Calculation

**Core Rule:** Due date is LAST DAY of the month

**Calculation Algorithm:**
```javascript
function calculateDueDate(startYear, startMonthIndex, paymentNumber) {
    // Calculate target month (0-based)
    targetMonthOffset = startMonthIndex + (paymentNumber - 1)
    
    // Calculate year and month considering rollover
    targetYear = startYear + Math.floor(targetMonthOffset / 12)
    targetMonth = targetMonthOffset % 12
    
    // Get last day of that month
    // Date(year, month+1, 0) gives last day of month
    lastDay = new Date(targetYear, targetMonth + 1, 0)
    
    return lastDay
}
```

**Examples:**

**Example 1: Simple**
```
Loan Date: October 7, 2025
Start Month: November 2025 (index 10)
Term: 3 months

Payment 1: November 30, 2025
Payment 2: December 31, 2025
Payment 3: January 31, 2026
```

**Example 2: Year Rollover**
```
Loan Date: October 7, 2025
Start Month: December 2025 (index 11)
Term: 3 months

Payment 1: December 31, 2025
Payment 2: January 31, 2026
Payment 3: February 28/29, 2026
```

**Example 3: February**
```
Loan Date: December 15, 2025
Start Month: February 2026 (index 1)
Term: 2 months

Payment 1: February 28, 2026 (or 29 if leap year)
Payment 2: March 31, 2026
```

---

### 9.3 Overdue Calculation

**Overdue Logic:**
```javascript
today = new Date()
dueDate = new Date(loan.next_payment_due)
daysDiff = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))

if (daysDiff > 0) {
    loan.is_overdue = true
    loan.days_overdue = daysDiff
} else {
    loan.is_overdue = false
    loan.days_until_due = -daysDiff
}
```

**Display Rules:**
- Overdue loans highlighted in red
- Shows "X days overdue"
- Sorted to top of active loans list
- Triggers penalty calculations

**Penalty Application:**
```javascript
if (loan.is_overdue) {
    latePenalty = Math.min(loan.days_overdue, 7) × 0.001 × loan.remaining_principal
    totalDue = regularPayment + latePenalty
}
```

---

## Validation & Business Constraints

### 10.1 Loan Validation Rules

**Amount Validation:**
```javascript
principal > 0  // Must be positive
principal <= availableCapital  // Cannot exceed available funds
```

**Term Validation:**
```javascript
term > 0  // Must be positive
term <= 24  // Maximum 24 months (soft limit)

// Stockvel-specific:
if (isStockvelLoan) {
    monthsUntilExpiry = calculateMonthsToExpiry(member.membershipEndDate)
    term <= monthsUntilExpiry  // Cannot exceed membership
}
```

**Stockvel Member Validation:**
```javascript
if (isStockvelLoan) {
    totalContributions > 0  // Must have contributions
    member.status !== 'expired'  // Membership must be active
    member exists in stockvelMembers array  // Must be registered
}
```

**Date Validation:**
```javascript
disbursementDate <= today  // Cannot be in future
startMonth >= currentMonth  // First payment cannot be in past
```

---

### 10.2 Payment Validation Rules

**Amount Validation:**
```javascript
paymentAmount > 0  // Must be positive
paymentAmount <= (remaining_principal + remaining_interest + fees)  // Cannot overpay unreasonably
```

**Date Validation:**
```javascript
paymentDate <= today  // Cannot be in future
paymentDate >= loan.disbursement_date  // Cannot be before loan start
```

**Loan Status Validation:**
```javascript
loan.status === 'active'  // Cannot pay completed/defaulted loans
loan.remaining_principal > 0  // Must have outstanding balance
```

---

### 10.3 Capital Management Rules

**Available Capital Calculation:**
```javascript
availableToLend = capital - deployedCapital
```

**Deployment Rules:**
```javascript
// On loan disbursement:
if (principal > availableToLend) {
    error("Insufficient capital available")
    return
}
deployedCapital += principal
```

**Return Rules:**
```javascript
// On payment received:
capital += principalPaid
deployedCapital -= principalPaid
```

**Capital Adjustment:**
```javascript
// Manual adjustment allowed
// Updates capital directly
// Adjusts availableToLend
// Recorded in transaction history
```

**Constraints:**
- Available capital cannot be negative
- Deployed capital cannot exceed total capital
- Manual adjustments must have notes

---

### 10.4 Client Constraints

**Account Number:**
- Must be unique across all clients
- Cannot be empty
- Case-sensitive
- No automatic formatting

**Status Rules:**
- active: Can receive new loans
- inactive: No new loans, existing loans continue
- defaulted: No new loans, flagged for collection
- blacklisted: Permanently banned from loans

**Client Type:**
- standard: Regular loans only
- stockvel_member: (Legacy) Being phased out in favor of separate member system

---

### 10.5 Membership Constraints

**Registration:**
- Member number must be unique (auto-generated ensures this)
- Phone number required
- Monthly contribution must be > 0
- Membership duration = 12 months (fixed)

**Contribution Rules:**
- totalContributions >= 0 (cannot be negative)
- accumulatedBonus >= 0 (cannot be negative)
- Contributions can only increase via deposits/adjustments
- Bonuses can decrease via payouts

**Membership Status:**
- Cannot issue loans to expired members
- Cannot take loans exceeding membership duration
- Must renew to continue benefits

---

## Data Management Rules

### 11.1 Data Storage Structure

**Primary Storage:** localStorage (browser-based)

**AppState Object:**
```javascript
{
    // Financial Data
    capital: 0,
    deployedCapital: 0,
    totalInterestEarned: 0,
    totalFeesEarned: 0,
    totalProfit: 0,
    profitGoal: 0,
    
    // Loan Data
    loans: [],
    nextLoanId: 1,
    
    // Client Data
    clients: [],
    
    // Stockvel Data (v1.7.0+)
    stockvelMembers: [],
    stockvelReceipts: [],
    nextMemberNumber: 1001,
    
    // Transaction History
    transactions: [],
    
    // Metadata
    lastBackupDate: null,
    version: "1.7.0"
}
```

**Storage Key:** `'tbfs_enhanced_app_state'`

---

### 11.2 Data Persistence Rules

**Auto-Save:**
```javascript
// After every state-changing operation:
saveState()  // Writes to localStorage immediately

// Operations that trigger save:
- Loan created
- Payment recorded
- Client added/edited
- Member registered
- Contribution recorded
- Capital adjusted
- Settings changed
```

**Save Function:**
```javascript
function saveState() {
    localStorage.setItem('tbfs_enhanced_app_state', JSON.stringify(AppState))
}
```

**Load Function:**
```javascript
function loadState() {
    const saved = localStorage.getItem('tbfs_enhanced_app_state')
    if (saved) {
        AppState = JSON.parse(saved)
        // Apply any migrations if needed
    } else {
        AppState = getDefaultState()
    }
}
```

**Load Timing:**
- On page load (DOMContentLoaded)
- After restore from backup
- After cloud sync

---

### 11.3 Backup Rules

**Local Backup (JSON):**
```javascript
// Download backup file
filename = `TBFS_Backup_${YYYYMMDD}_${HHMMSS}.json`
content = JSON.stringify(AppState, null, 2)
download(filename, content)
```

**Restore from Local:**
```javascript
// Upload JSON file
file = selectedFile
content = await file.text()
newState = JSON.parse(content)

// Validate structure
if (validateState(newState)) {
    AppState = newState
    saveState()
    reloadUI()
}
```

**Cloud Backup (GitHub):**
```javascript
// Requirements:
- Personal Access Token (encrypted in localStorage)
- Repository: user-specified
- Branch: main or user-specified

// Backup process:
1. Stringify AppState
2. Encode as base64
3. Create/update file via GitHub API
4. Store commit SHA
5. Update lastBackupDate
```

**Auto-Backup:**
```javascript
if (autoBackupEnabled) {
    // Triggers:
    - On every state change
    - Throttled to max once per minute
    - Only if changes detected
    - Uses GitHub cloud backup
}
```

---

### 11.4 Data Validation Rules

**State Validation:**
```javascript
function validateState(state) {
    checks = [
        state.capital !== undefined,
        Array.isArray(state.loans),
        Array.isArray(state.clients),
        Array.isArray(state.stockvelMembers),
        state.nextLoanId > 0,
        state.nextMemberNumber >= 1001
    ]
    return checks.every(c => c === true)
}
```

**Loan Data Integrity:**
```javascript
// On load, verify:
- All loans have valid client references
- All stockvel loans have valid member references
- Remaining principal >= 0
- Payments made <= term
- Dates are valid
```

**Member Data Integrity:**
```javascript
// On load, verify:
- All member numbers are unique
- totalContributions >= 0
- accumulatedBonus >= 0
- Membership dates are valid
```

**Repair Rules:**
```javascript
// If inconsistency found:
1. Log issue to console
2. Attempt automatic repair if possible
3. If cannot repair, mark as warning
4. Continue operation with valid data
```

---

### 11.5 Migration Rules

**Version Detection:**
```javascript
if (!AppState.version || AppState.version < "1.7.0") {
    migrateToV1_7_0()
}
```

**Migration v1.7.0 (Separate Member System):**
```javascript
function migrateToV1_7_0() {
    // Initialize new fields if missing
    if (!AppState.stockvelMembers) {
        AppState.stockvelMembers = []
    }
    if (!AppState.stockvelReceipts) {
        AppState.stockvelReceipts = []
    }
    if (!AppState.nextMemberNumber) {
        AppState.nextMemberNumber = 1001
    }
    
    // Migrate existing stockvel clients to members
    stockvelClients = AppState.clients.filter(c => c.isStockvelMember)
    stockvelClients.forEach(client => {
        member = {
            memberNumber: AppState.nextMemberNumber++,
            name: `${client.first_name} ${client.last_name}`,
            phone: client.phone || "",
            email: client.email || "",
            membershipStartDate: client.created_date || today,
            membershipEndDate: calculateEndDate(client.created_date || today),
            monthlyContribution: client.monthly_contribution || 0,
            totalContributions: client.total_contributions || 0,
            accumulatedBonus: 0,  // Reset bonuses in new system
            status: 'active'
        }
        AppState.stockvelMembers.push(member)
    })
    
    AppState.version = "1.7.0"
    saveState()
}
```

---

## PWA & Technical Rules

### 12.1 Progressive Web App Requirements

**Manifest Configuration:**
```json
{
    "name": "TBFS Loan Management System",
    "short_name": "TBFS",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#667eea",
    "theme_color": "#667eea",
    "icons": [
        { "src": "icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
    ]
}
```

**Service Worker Rules:**
```javascript
// Cache-first strategy for app shell
// Network-first for API calls
// Fallback to offline page if network fails
```

**Offline Capabilities:**
- Full functionality without internet
- All calculations work offline
- Data stored locally
- Cloud sync when connection available

---

### 12.2 Update Rules

**Version Detection:**
```javascript
currentVersion = "1.7.0"  // In code
installedVersion = AppState.version || "1.0.0"

if (installedVersion < currentVersion) {
    showUpdateBanner()
    applyMigrations()
}
```

**Update Banner:**
```javascript
if (updateAvailable) {
    display = "New version available! Click to update."
    onclick = reloadPage()  // Applies service worker update
}
```

**Auto-Check:**
```javascript
// Check every 30 minutes
setInterval(checkForUpdates, 30 * 60 * 1000)

async function checkForUpdates() {
    try {
        response = await fetch('/manifest.json?t=' + Date.now())
        remoteVersion = extractVersion(response)
        if (remoteVersion > currentVersion) {
            updateAvailable = true
        }
    } catch {}
}
```

---

### 12.3 Navigation Rules

**Tab System:**
- 8 main tabs: Calculator, Dashboard, Clients, Stockvel, Active Loans, Reports, Income Table, Settings
- Click navigation
- Keyboard navigation (Arrow Left/Right)
- Swipe navigation (touch devices)
- Active tab highlighted

**Swipe Navigation:**
```javascript
// On touchstart: record startX
// On touchmove: calculate deltaX
// On touchend:
if (Math.abs(deltaX) > 50) {  // Minimum swipe distance
    if (deltaX > 0) navigatePrevious()
    else navigateNext()
}
```

**Keyboard Navigation:**
```javascript
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') navigatePrevious()
    if (e.key === 'ArrowRight') navigateNext()
})
```

**Scroll Behavior:**
```javascript
// Header hides on scroll down
// Header shows on scroll up
// Tab bar remains fixed
```

---

### 12.4 Export Rules

**PDF Export:**
```javascript
// Uses jsPDF library
// Exports:
- Loan schedules
- Member statements
- Reports

// Format: A4
// Auto-download with descriptive filename
```

**Excel Export:**
```javascript
// Uses SheetJS library
// Exports:
- Business reports (multi-sheet)
- Client lists
- Transaction history
- Contribution history

// Format: .xlsx
// Auto-download with descriptive filename
```

**CSV Export:**
```javascript
// Plain text CSV
// Exports:
- Member registry
- Contribution history
- Simple data tables

// Format: .csv
// Compatible with Excel/Google Sheets
```

---

### 12.5 Security Rules

**Data Encryption:**
```javascript
// GitHub PAT encrypted in localStorage
// Uses browser's crypto API
// Key derived from user input
```

**Input Sanitization:**
```javascript
// All user inputs validated
// Numbers parsed as floats
// Dates validated before storage
// XSS prevention on text inputs
```

**Access Control:**
```javascript
// No authentication (single-user system)
// All data stored locally
// No external API calls (except GitHub backup)
// No sensitive data sent to third parties
```

---

## Summary & Quick Reference

### Key Business Rules by Category

**INTEREST RATES:**
- Standard: 15% monthly (declining balance)
- Stockvel Tiers: 3%, 8%, 15%, 25%, 30% (based on loan-to-savings ratio)
- Minimum: 10% (stockvel only, triggers bonus system)

**FEES:**
- Standard Initiation: 9% of principal
- Stockvel Initiation: 12% of excess (waived up to contributions)
- Standard Admin: R60/month fixed
- Stockvel Admin: R60 × (1 - tieredRate) variable

**MEMBERSHIP:**
- Duration: 12 months
- Renewal: Extends 12 months from current end date
- Max Loan Term: Cannot exceed months until expiry
- Member Number: Auto-generated from 1001

**BONUSES:**
- Triggers: When amountDueToTBFS < 10% minimum
- Storage: accumulatedBonus field (separate from contributions)
- Display: Hidden until revealed in statements
- Payout: Can be paid out anytime

**PAYMENTS:**
- Allocation: Admin → Initiation → Interest → Principal
- Due Date: Last day of selected start month
- Early Payoff: 20% discount on remaining interest
- Late Penalty: 0.1% per day (max 7 days)

**DATA:**
- Storage: localStorage primary
- Backup: JSON download + optional GitHub cloud
- Auto-Save: On every state change
- Structure: Separate arrays for clients, members, loans, receipts

---

## Document Control

**Version History:**
- v1.0 - Initial comprehensive documentation (2025-10-31)

**Maintenance:**
- Update when business rules change
- Add examples for new features
- Keep synchronized with code implementation
- Review quarterly for accuracy

**References:**
- Source code: /workspace/index.html
- Feature documentation: /workspace/TBFS-FEATURES.md
- Calculation guides: /workspace/*.md files

---

**END OF BUSINESS RULES DOCUMENTATION**

*This document represents a complete extraction of all business rules from the TBFS Loan Management System as of October 31, 2025. All rules have been verified against the source code and supporting documentation.*
