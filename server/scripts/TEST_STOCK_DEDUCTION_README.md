# Stock Deduction Test Script

## Overview
This script tests if stock deduction is working correctly when orders are placed. It finds orders with balls or trophies, checks stock before/after, and verifies the deduction process.

## Usage

### Basic Test (Dry Run)
```bash
node server/scripts/test-stock-deduction.js --dry-run
```
This will:
- Find a recent order with balls/trophies
- Show stock before deduction
- Show what would happen (without making changes)

### Test Specific Order
```bash
# By order number
node server/scripts/test-stock-deduction.js --order-number=ORD-1234567890

# By order ID
node server/scripts/test-stock-deduction.js --order-id=uuid-here
```

### Test with Products That Have Stock (Recommended)
```bash
# Dry run - see what would happen
node server/scripts/test-stock-deduction.js --find-stock --dry-run

# Actual test - will deduct stock
node server/scripts/test-stock-deduction.js --find-stock
```
This will:
- Find products that actually have stock in the database
- Create a test with one of those products
- Test the deduction on a branch with actual stock

### Actual Test (Will Deduct Stock)
```bash
node server/scripts/test-stock-deduction.js
```
⚠️ **Warning**: This will actually deduct stock from the database!

## What It Tests

1. **Finds orders** with balls or trophies
2. **Checks stock** before deduction
3. **Runs deduction** function (same as in orders.js)
4. **Checks stock** after deduction
5. **Compares** before/after to verify deduction worked

## Output

The script shows:
- Order details (ID, number, status, items)
- Each item's branchId (from product modal)
- Stock before deduction
- Deduction results (success/failure)
- Stock after deduction
- Stock changes comparison

## Common Issues

### Missing branchId
If items don't have `branchId`, the script will warn:
```
⚠️ WARNING: Some items are missing branchId
```
**Solution**: Items need `branchId` set from the product modal when user selects a branch.

### Product Not Found
If product isn't found in the specified branch:
```
⚠️ Product exists but not in branch X. Found in branches: Y, Z
```
**Solution**: Check if the product exists in that branch, or if branchId is incorrect.

### Stock Already Zero
If stock is already 0, deduction will still work but stock stays at 0 (can't go negative).

## Example Output

```
🧪 Testing Stock Deduction
============================================================
✅ Found order: ORD-1234567890
   Order ID: abc-123
   Status: pending
   Items: 1

📦 Order Items:
   1. Basketball (Balls)
      Quantity: 2
      Branch ID: 1

🔍 Checking stock BEFORE deduction...
   ✅ Found product: xyz-789 in branch 1

📊 Stock Before:
   Basketball (Branch 1): 10 units

🔄 Running stock deduction...
✅ Deducted 2 from Basketball (balls) at branch 1. Stock: 10 → 8

📊 Stock After:
   Basketball (Branch 1): 8 units

📈 Stock Changes:
   ✅ Basketball: 10 → 8 (deducted 2)

✅ TEST PASSED: Stock deduction is working correctly!
```

## Notes

- Only tests balls and trophies (apparel products don't have stock)
- Uses the same deduction logic as the actual order creation
- Can run in dry-run mode to see what would happen without changes
- Shows detailed debugging information to help identify issues

