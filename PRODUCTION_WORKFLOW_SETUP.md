# Production Workflow System Setup

## Overview

This system tracks orders through 7 production stages that match your business workflow:

1. **Layout** - Initial design layout
2. **Sizing** - Size specifications and adjustments  
3. **Printing** - Printing process
4. **Press** - Press operations
5. **Prod** - Production finalization
6. **Packing/Completing** - Packing and final checks
7. **Picked Up/Delivered** - Order pickup or delivery

## Setup Instructions

### Step 1: Run the SQL Migration

1. Open your **Supabase Dashboard**
2. Navigate to the **SQL Editor** (in the left sidebar)
3. Click **"New Query"**
4. Copy the contents of `server/scripts/create-production-workflow.sql`
5. Paste into the SQL editor
6. Click **"Run"** or press `Ctrl+Enter`

The migration will:
- ✅ Add `production_status` column to orders table
- ✅ Create `production_workflow` table
- ✅ Create `production_workflow_history` table for audit trail
- ✅ Set up triggers to automatically initialize workflow for new orders
- ✅ Initialize workflow stages for all existing orders
- ✅ Configure Row Level Security (RLS) policies

### Step 2: Verify the Setup

After running the SQL, verify it worked by running this query in the SQL Editor:

```sql
SELECT 
  o.order_number,
  pw.stage,
  pw.status,
  pw.created_at
FROM orders o
LEFT JOIN production_workflow pw ON o.id = pw.order_id
ORDER BY o.created_at DESC, 
  CASE pw.stage
    WHEN 'layout' THEN 1
    WHEN 'sizing' THEN 2
    WHEN 'printing' THEN 3
    WHEN 'press' THEN 4
    WHEN 'prod' THEN 5
    WHEN 'packing_completing' THEN 6
    WHEN 'picked_up_delivered' THEN 7
    ELSE 99
  END
LIMIT 50;
```

You should see all your orders with 7 workflow stages each (all initially set to 'pending').

### Step 3: Start Using the System

1. **Restart your backend server** (if it's running):
   ```bash
   npm run server:dev
   ```

2. **Refresh your frontend** application

3. **Access the production workflow**:
   - Go to Admin → Orders
   - Click "View Details" on any order
   - For orders in "processing" or "completed" status, you'll see the **Production Workflow** section

## Using the Production Workflow

### Admin Interface

When viewing an order in the admin panel:

1. **View Progress**: See a progress bar showing overall completion percentage
2. **Current Stage**: Highlighted card showing which stage is active
3. **Stage Actions**:
   - **Pending** → Click "Start" to begin the stage
   - **In Progress** → Click "Mark Complete" to finish the stage
   - **Completed** → Click "Reopen" if you need to redo work
   - **Any Stage** → Click "Skip" if not applicable

4. **History**: Click "Show History" to see all status changes with timestamps

### API Endpoints

The system exposes these API endpoints:

- `GET /api/production-workflow/:orderId` - Get workflow for an order
- `GET /api/production-workflow/:orderId/history` - Get workflow history
- `GET /api/production-workflow/:orderId/progress` - Get progress summary
- `PUT /api/production-workflow/:orderId/stage/:stage` - Update a stage
- `PUT /api/production-workflow/:orderId/bulk-update` - Update multiple stages
- `GET /api/production-workflow/status/overview` - Get overview of all orders
- `GET /api/production-workflow/meta/stages` - Get stage metadata

### Stage Status Options

Each stage can have one of these statuses:

- **pending** ⏳ - Not started yet
- **in_progress** 🔄 - Currently being worked on
- **completed** ✅ - Successfully finished
- **skipped** ⏭️ - Not applicable for this order

## Database Schema

### production_workflow table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Reference to orders table |
| stage | VARCHAR(50) | Stage name (layout, sizing, etc.) |
| status | VARCHAR(20) | Current status |
| started_at | TIMESTAMPTZ | When the stage was started |
| completed_at | TIMESTAMPTZ | When the stage was completed |
| notes | TEXT | Additional notes |
| updated_by | VARCHAR(100) | Who last updated this stage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### production_workflow_history table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Reference to orders table |
| stage | VARCHAR(50) | Stage name |
| previous_status | VARCHAR(20) | Status before change |
| new_status | VARCHAR(20) | Status after change |
| changed_by | VARCHAR(100) | Who made the change |
| change_notes | TEXT | Notes about the change |
| timestamp | TIMESTAMPTZ | When the change occurred |

## Troubleshooting

### Workflow not showing in UI

1. Make sure the order status is "processing" or "completed"
2. Check browser console for errors
3. Verify the backend server is running
4. Check that the SQL migration ran successfully

### Database errors

If you see "relation does not exist" errors:
1. Re-run the SQL migration in Supabase
2. Check that you're connected to the correct Supabase project
3. Verify your `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Stages not initializing for new orders

1. Check that the trigger is created: Run in SQL Editor:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_initialize_production_workflow';
   ```
2. If not found, re-run the migration SQL

## Future Enhancements

Possible features to add:

- [ ] Email notifications when stages complete
- [ ] Estimated time per stage tracking
- [ ] Assign specific users to stages
- [ ] Upload images/files per stage
- [ ] Stage dependencies (can't start press until printing is done)
- [ ] Reports and analytics on stage completion times
- [ ] Customer-facing order tracking with workflow visibility

## Support

If you encounter any issues, check:

1. Browser console for frontend errors
2. Server logs for backend errors
3. Supabase dashboard → Logs for database errors
4. Network tab in browser dev tools for API request failures

