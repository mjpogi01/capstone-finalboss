# Stock Deduction Backfill Guide

## Overview

This guide explains how to backfill stock deductions for orders that were placed before the stock deduction fix was implemented.

## Current Status

✅ **New orders** (placed after the fix) will automatically deduct stock correctly.

⚠️ **Old orders** (placed before the fix) need to be processed using the backfill script.

## Quick Start

### 1. Test Run (Dry Run)

First, run a dry run to see what would be deducted without making any changes:

```bash
npm run backfill-stock:dry-run
```

This will show you:
- How many orders would be processed
- What items would have stock deducted
- Any errors that would occur

### 2. Process All Orders

Once you've verified the dry run looks correct, process all orders:

```bash
npm run backfill-stock
```

### 3. Process Specific Orders

#### Process a single order:
```bash
node server/scripts/backfill-stock-deductions.js --order-id <ORDER_UUID>
```

#### Process orders by status:
```bash
node server/scripts/backfill-stock-deductions.js --status pending
node server/scripts/backfill-stock-deductions.js --status picked_up_delivered
```

#### Process orders by date range:
```bash
node server/scripts/backfill-stock-deductions.js --from-date 2024-01-01 --to-date 2024-12-31
```

#### Combine filters:
```bash
node server/scripts/backfill-stock-deductions.js --status picked_up_delivered --from-date 2024-01-01 --dry-run
```

## Options

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run` | Show what would be deducted without actually deducting | `--dry-run` |
| `--order-id` | Process only a specific order ID | `--order-id abc123...` |
| `--status` | Process only orders with specific status | `--status pending` |
| `--from-date` | Process orders from this date onwards | `--from-date 2024-01-01` |
| `--to-date` | Process orders up to this date | `--to-date 2024-12-31` |

## How It Works

The backfill script:

1. **Fetches orders** matching your criteria (default: all non-cancelled orders)
2. **For each order:**
   - Extracts order items
   - Resolves branch ID from `pickup_branch_id` or `pickup_location`
   - For **balls/trophies**: Finds product in any available branch
   - For **other products**: Uses the resolved branch ID
   - Deducts stock accordingly

3. **Reports results:**
   - Total orders processed
   - Success count
   - Error count (with details)

## Stock Deduction Logic

### Balls and Trophies
- **Only products with stock**: Only balls and trophies have stock that needs to be deducted
- **Disconnected from selected branch**: Stock is deducted from the first available branch where the product exists
- This matches the new behavior where checkout branch selection doesn't affect balls/trophies stock

### Apparel Products (Jerseys, Uniforms, T-shirts, etc.)
- **Pre-ordered (Made to Order)**: Apparel products are all pre-ordered and do NOT have stock
- **No stock deduction**: These products are skipped during stock deduction
- Stock is not tracked for apparel products since they are manufactured per order

## Safety Features

1. **Dry Run Mode**: Always test with `--dry-run` first
2. **Error Handling**: Individual order errors don't stop the entire process
3. **Detailed Logging**: See exactly what's being deducted for each order
4. **Cancelled Orders**: Automatically excluded (unless you specify `--status cancelled`)

## Example Output

```
🔄 Starting stock deduction backfill...
   Dry Run: NO (will deduct stock)
   Status Filter: picked_up_delivered

📋 Found 15 order(s) to process

[1/15] Processing Order: ORD-1234567890 (abc-123...)
   Status: picked_up_delivered
   Created: 2024-01-15T10:30:00Z
   Items: 3
   📍 Resolved branch ID from location: 1
📦 Deducting stock for order items
📦 Found Basketball in selected branch 1
✅ Deducted 2 from Basketball (balls) at branch 1. Stock: 50 → 48
   ✅ Stock deducted successfully

...

📊 Backfill Summary:
   Total Orders Processed: 15
   Successful: 15
   Errors: 0

✅ Backfill completed!
```

## Troubleshooting

### "No orders found matching the criteria"
- Check your date range or status filter
- Verify orders exist in the database

### "Error fetching product"
- Product might not exist in the database
- Check product name and category match exactly

### "No pickup branch ID provided"
- This should not occur for balls/trophies (they use any available branch)
- Apparel products are skipped anyway (they don't have stock)

### "Invalid size_stocks for trophy product"
- Trophy product might have corrupted size_stocks data
- Check the product in the database

## Important Notes

⚠️ **Always run a dry run first** to verify the results before actually deducting stock.

⚠️ **Backup your database** before running the backfill script in production.

⚠️ **Run during low-traffic periods** to avoid conflicts with new orders.

⚠️ **Monitor the results** - check that stock levels look correct after running.

## Support

If you encounter issues:
1. Check the error messages in the output
2. Verify your database connection
3. Ensure products exist in the database
4. Check that order_items are properly formatted

