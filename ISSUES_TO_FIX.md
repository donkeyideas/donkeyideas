# Issues to Fix - Action Plan

## 🔴 CRITICAL ISSUES (Blocking Core Features)

### 1. Budget System - 500 Errors
**Problem:** Database tables don't exist yet  
**Status:** Migration file created but not committed properly  
**Impact:** Entire budget system unusable  

**Fix Required:**
- Properly commit and push migration file
- OR manually run SQL in Supabase
- Tables needed: budget_categories, budget_periods, budget_lines

**Priority:** HIGH - Blocking new feature  
**Time:** 5 minutes  

---

### 2. Logout Button - HTTP 405 Error
**Problem:** `GET /api/auth/logout` not allowed (endpoint only supports POST)  
**Error:** `HTTP ERROR 405 Method Not Allowed`  
**Impact:** Users can't log out  

**Fix Required:**
- Update logout link/button to use POST instead of GET
- OR create GET handler in logout route
- Located in: sidebar.tsx or wherever logout button is

**Priority:** HIGH - Security/UX issue  
**Time:** 5 minutes  

---

### 3. Project Board - TypeError: t.tags.map
**Problem:** Same .map() null safety issue  
**Error:** `TypeError: t.tags.map is not a function`  
**Impact:** Project board page crashes  

**Fix Required:**
- Add null safety to project board page
- Check that tags is initialized as array
- Add optional chaining: tags?.map()

**Priority:** MEDIUM - Feature broken  
**Time:** 10 minutes  

---

## 🟡 DATA ISSUES (Incorrect Calculations)

### 4. Intercompany Transactions - Wrong Category
**Problem:** Intercompany transfers being booked as expenses  
**Current:** Shows as expense in P&L  
**Expected:** Should be asset (receivable) / liability (payable), NOT affect P&L  

**Fix Required:**
- Review intercompany transaction creation logic
- Ensure type='asset' for receivables, type='liability' for payables
- Verify affectsPL=false
- May need to fix existing transactions

**Priority:** MEDIUM - Incorrect financials  
**Time:** 15 minutes  

---

### 5. Financial Statements Validation Failed
**Problem:** Some validation check failing  
**Error:** `⚠️ Financial statements validation failed: Array(1)`  
**Impact:** Unknown - need to see what validation is failing  

**Fix Required:**
- Check browser console for full error message
- Review validation logic
- Fix the specific validation error

**Priority:** LOW - Warning, not blocking  
**Time:** 10 minutes  

---

## 📋 RECOMMENDED FIX ORDER

### Phase 1: Critical Fixes (20 minutes)
1. ✅ **Budget Migration** (5 min)
   - Force commit migration file properly
   - Push to trigger auto-deployment
   - Test: Create category works

2. ✅ **Logout Button** (5 min)
   - Fix HTTP method or create GET handler
   - Test: Can logout successfully

3. ✅ **Project Board Map Error** (10 min)
   - Add null safety to tags.map()
   - Test: Project board loads

### Phase 2: Data Integrity (25 minutes)
4. ✅ **Intercompany Accounting** (15 min)
   - Review and fix transaction creation
   - Test with sample transfer
   - Verify P&L not affected

5. ✅ **Validation Warning** (10 min)
   - Investigate validation error
   - Fix if critical

---

## 🎯 WHICH ISSUES TO FIX FIRST?

### Option A: Fix All (45 minutes total)
- Complete solution, everything working
- Recommended for production stability

### Option B: Critical Only (20 minutes)
- Budget, Logout, Project Board
- Get core features working quickly
- Address data issues later

### Option C: One at a Time
- You tell me which issue is most important
- I fix it completely
- Move to next

---

## ❓ DECISION NEEDED

**What would you like me to do?**

A) Fix all 5 issues in order (recommended)  
B) Fix critical 3 first (Budget, Logout, Project Board)  
C) Pick one issue to start with  
D) Something else  

Let me know and I'll start immediately!
