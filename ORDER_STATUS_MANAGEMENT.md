# Order Status Management System

## Overview

The order management system now has a comprehensive status workflow integrated with the production tracking system.

## Order Status Flow

```
Pending → Confirmed → Processing → Completed → Delivered
          ↓
       Cancelled (can be reactivated)
```

## Status Definitions

### 1. **Pending** 🟡
- **Description**: New order received, awaiting review and design upload
- **Actions Available**:
  - ✓ Confirm Order (moves to Confirmed)
  - ✕ Cancel Order (moves to Cancelled)
- **What to do**: 
  - Review order details
  - Upload design files
  - Contact customer if needed

### 2. **Confirmed** 🔵
- **Description**: Order confirmed with design files uploaded, ready to start production
- **Actions Available**:
  - 🔄 Start Processing (moves to Processing)
- **Production Workflow**: Visible but all stages are pending
- **What to do**:
  - Review design files
  - Prepare materials
  - Click "Start Processing" when ready to begin production

### 3. **Processing** ⚙️
- **Description**: Order is in active production
- **Actions Available**:
  - ✅ Mark as Completed (moves to Completed)
- **Production Workflow**: Active - track through all 7 stages:
  1. Layout
  2. Sizing
  3. Printing
  4. Press
  5. Prod
  6. Packing/Completing
  7. Picked Up/Delivered (within workflow)
- **What to do**:
  - Use Production Workflow to track manufacturing stages
  - Update each stage as work progresses
  - Complete when all manufacturing is done

### 4. **Completed** ✅
- **Description**: Manufacturing complete, order ready for pickup/delivery
- **Actions Available**:
  - 🚚 Mark as Delivered (moves to Delivered)
  - ↩️ Reopen for Processing (if rework needed)
- **What to do**:
  - Quality check the final product
  - Notify customer for pickup/delivery
  - Mark as delivered once handed over

### 5. **Delivered** 🎉
- **Description**: Order successfully delivered to customer
- **Actions Available**: None (final status)
- **What to do**: Archive order for records

### 6. **Cancelled** ❌
- **Description**: Order was cancelled
- **Actions Available**:
  - 🔄 Reactivate Order (returns to Pending)
- **What to do**: 
  - Process refund if applicable
  - Archive order
  - Can reactivate if customer changes mind

## Visual Status Indicators

### Status Cards
Each order displays:
- **Order Status**: Current main status (Pending, Confirmed, etc.)
- **Production Stage**: Current manufacturing stage (when applicable)

### Status Colors
- 🟡 **Pending**: Yellow/Amber
- 🔵 **Confirmed**: Light Blue
- ⚙️ **Processing**: Blue
- ✅ **Completed**: Green
- 🎉 **Delivered**: Dark Green
- ❌ **Cancelled**: Red

### Status Flow Visualization
A visual timeline shows progress through the workflow:
```
[Pending] → [Confirmed] → [Processing] → [Completed] → [Delivered]
```
- Current status: Highlighted in blue
- Completed statuses: Green
- Future statuses: Gray

## Integration with Production Workflow

### When Production Workflow is Visible
The 7-stage production workflow appears for orders with these statuses:
- ✓ Confirmed (all stages pending, ready to start)
- ✓ Processing (stages actively being worked on)
- ✓ Completed (all stages should be complete)

### When Production Workflow is Hidden
- Pending orders (no design files yet)
- Cancelled orders
- Delivered orders (historical record)

## Design Upload Process

1. **Order Created** → Status: `Pending`
2. **Admin Reviews Order**
3. **Admin Uploads Design Files** → Status: `Confirmed`
4. **Admin Clicks "Start Processing"** → Status: `Processing`
5. **Production Workflow Begins**

## Admin Actions by Status

### Pending Orders
```
┌─────────────────────┐
│  ✓ Confirm Order    │  → Upload designs first
│  ✕ Cancel Order     │  → If order can't be fulfilled
└─────────────────────┘
```

### Confirmed Orders
```
┌─────────────────────────┐
│  🔄 Start Processing    │  → Begin production
└─────────────────────────┘
💡 Design files are uploaded and visible
```

### Processing Orders
```
┌──────────────────────────┐
│  ✅ Mark as Completed    │  → When manufacturing done
└──────────────────────────┘
💡 Use Production Workflow above to track stages
```

### Completed Orders
```
┌────────────────────────────────┐
│  🚚 Mark as Delivered          │  → Final step
│  ↩️ Reopen for Processing      │  → If rework needed
└────────────────────────────────┘
```

### Delivered Orders
```
┌────────────────────────────┐
│  ✓ Order Complete          │  → No actions needed
└────────────────────────────┘
```

### Cancelled Orders
```
┌───────────────────────┐
│  🔄 Reactivate Order  │  → Restore if needed
└───────────────────────┘
```

## Tips for Efficient Order Management

### 1. **Bulk Processing**
- Filter orders by status
- Process all pending orders at once
- Upload designs in batches

### 2. **Production Tracking**
- Update workflow stages in real-time
- Use notes field for special instructions
- Review history to identify bottlenecks

### 3. **Customer Communication**
- Update status promptly
- Customers can see order status
- Set expectations based on production stage

### 4. **Quality Control**
- Review completed stages before moving to next
- Use "Reopen" if issues found
- Document problems in notes

## Database Status Values

Supported status values in database:
```sql
'pending', 'confirmed', 'processing', 'completed', 'delivered', 'cancelled', 'shipped'
```

Note: `shipped` is supported for backwards compatibility, but `delivered` is the preferred final status.

## Troubleshooting

### Production Workflow Not Showing
- **Check**: Is order status `confirmed`, `processing`, or `completed`?
- **Fix**: Update order status appropriately

### Can't Change Status
- **Check**: Are you logged in as admin/owner?
- **Check**: Is the order in a valid state for the transition?
- **Fix**: Verify permissions and workflow rules

### Design Files Not Uploading
- **Check**: File size and format
- **Check**: Network connection
- **Check**: Cloudinary configuration
- **Fix**: Review server logs for detailed errors

## Best Practices

1. **Always upload design files** before confirming orders
2. **Start processing** only when ready to manufacture
3. **Update workflow stages** as work progresses
4. **Complete orders** only when quality checked
5. **Mark delivered** when customer receives order
6. **Use notes** to document special situations
7. **Review history** to improve processes

## Future Enhancements

Planned improvements:
- [ ] Automatic status updates based on workflow progress
- [ ] Email notifications on status changes
- [ ] Estimated completion time per stage
- [ ] Customer-visible tracking page
- [ ] Batch status updates
- [ ] Status change logs for customers
- [ ] Mobile app for status updates

