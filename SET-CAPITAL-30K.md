# Set Available Capital to R30,000

## Quick Method - Browser Console

### **Option 1: Direct Set (Fastest)**

1. Open any TBFS page (e.g., `active-loans.html` or `calculator.html`)
2. Press **F12** to open Developer Console
3. Paste this command:

```javascript
AppState.capital = 30000;
AppStateManager.save(AppState);
console.log('✅ Capital set to R30,000');
location.reload();
```

4. Press **Enter**
5. Page will reload with R30,000 capital ✅

---

### **Option 2: With Reset (Clean Start)**

If you want to reset everything and start fresh:

```javascript
// Reset and set capital
AppState.capital = 30000;
AppState.deployed = 0;
AppState.totalInterestEarned = 0;
AppState.totalFeesEarned = 0;
AppStateManager.save(AppState);
console.log('✅ Capital set to R30,000 (fresh start)');
location.reload();
```

---

### **Option 3: View Current State First**

To see current values before changing:

```javascript
// Check current state
console.log('Current Capital:', AppState.capital);
console.log('Deployed:', AppState.deployed);
console.log('Available:', AppState.capital - AppState.deployed);

// Set to 30,000
AppState.capital = 30000;
AppStateManager.save(AppState);
console.log('✅ New Capital:', AppState.capital);
location.reload();
```

---

## Expected Result

After running the command, you should see:

**Dashboard:**
```
💰 Available Capital: R 30,000.00
📊 Deployed Capital: R 0.00 (or current deployed amount)
💵 Total Capital: R 30,000.00
```

---

## Verify It Worked

1. Open any TBFS page
2. Check the dashboard or capital display
3. Should show **R30,000** available

---

**Quick Copy-Paste:**
```javascript
AppState.capital = 30000; AppStateManager.save(AppState); location.reload();
```

Just paste that in the console and hit Enter! ✅
