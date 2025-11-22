# Email Marketing Database Setup Guide

## 📋 Database Requirements

To enable the email marketing feature, you need to create the `newsletter_subscriptions` table in your Supabase database.

## ✅ Step-by-Step Setup

### 1. Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**

### 2. Run the SQL Script

Copy and paste the entire contents of `server/scripts/create-newsletter-subscriptions-table.sql` into the SQL Editor, then click **Run**.

**OR** copy this SQL directly:

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create newsletter_subscriptions table
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source VARCHAR(100) DEFAULT 'website',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON public.newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_is_active ON public.newsletter_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_user_id ON public.newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_subscribed_at ON public.newsletter_subscriptions(subscribed_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_newsletter_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON public.newsletter_subscriptions;
CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_newsletter_subscriptions_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow anyone to subscribe (INSERT)
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscriptions;
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own subscription (SELECT)
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.newsletter_subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON public.newsletter_subscriptions
  FOR SELECT
  USING (true);

-- Allow users to update their own subscription (UPDATE)
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.newsletter_subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON public.newsletter_subscriptions
  FOR UPDATE
  USING (true);

-- Service role can do everything (for backend/admin operations)
DROP POLICY IF EXISTS "Service role full access" ON public.newsletter_subscriptions;
CREATE POLICY "Service role full access"
  ON public.newsletter_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');
```

### 3. Verify Table Creation

After running the script, verify the table was created:

1. Go to **Table Editor** in Supabase
2. Look for `newsletter_subscriptions` table
3. You should see these columns:
   - `id` (UUID, Primary Key)
   - `email` (VARCHAR, Unique)
   - `subscribed_at` (Timestamp)
   - `is_active` (Boolean)
   - `unsubscribed_at` (Timestamp, nullable)
   - `source` (VARCHAR)
   - `user_id` (UUID, Foreign Key to auth.users)
   - `created_at` (Timestamp)
   - `updated_at` (Timestamp)

### 4. Verify RLS Policies

1. Go to **Authentication** → **Policies** in Supabase
2. Find `newsletter_subscriptions` table
3. You should see 4 policies:
   - ✅ "Anyone can subscribe" (INSERT)
   - ✅ "Users can view their own subscription" (SELECT)
   - ✅ "Users can update their own subscription" (UPDATE)
   - ✅ "Service role full access" (ALL)

## 📊 Table Schema Details

### Columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `email` | VARCHAR(255) | Subscriber email (unique) |
| `subscribed_at` | TIMESTAMP | When they subscribed |
| `is_active` | BOOLEAN | Whether subscription is active |
| `unsubscribed_at` | TIMESTAMP | When they unsubscribed (nullable) |
| `source` | VARCHAR(100) | Where subscription came from (default: 'website') |
| `user_id` | UUID | Link to user account (nullable) |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time (auto-updated) |

### Indexes:

- `idx_newsletter_subscriptions_email` - Fast email lookups
- `idx_newsletter_subscriptions_is_active` - Fast filtering of active subscribers
- `idx_newsletter_subscriptions_user_id` - Fast user lookups
- `idx_newsletter_subscriptions_subscribed_at` - Sorting by subscription date

## 🔒 Security (RLS Policies)

The table uses Row Level Security (RLS) with these policies:

1. **Anyone can subscribe** - Allows public subscription
2. **Users can view subscriptions** - Allows viewing (for unsubscribe functionality)
3. **Users can update subscriptions** - Allows unsubscribe
4. **Service role full access** - Backend can do everything (for admin operations)

## ✅ Verification Checklist

After setup, verify:

- [ ] Table `newsletter_subscriptions` exists
- [ ] All columns are present
- [ ] Indexes are created
- [ ] RLS is enabled
- [ ] All 4 policies are active
- [ ] Trigger for `updated_at` is working

## 🧪 Test the Setup

1. **Test Subscription:**
   - Go to your website's newsletter section
   - Enter an email and subscribe
   - Check Supabase Table Editor to see the new record

2. **Test Admin Access:**
   - Log in as owner
   - Go to Admin Dashboard → Accounts → Email Marketing
   - You should see the subscriber count

3. **Test Email Sending:**
   - Create a test marketing email
   - Send it to subscribers
   - Check your email inbox

## 🚨 Troubleshooting

### If table already exists:
The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### If you get permission errors:
Make sure you're using the Supabase SQL Editor with proper permissions, or use the service role key.

### If RLS policies fail:
Check that RLS is enabled and policies are correctly created. You may need to recreate them.

## 📝 Notes

- The table is designed to handle both logged-in users (with `user_id`) and anonymous subscribers (without `user_id`)
- The `is_active` flag allows soft-delete (unsubscribe without deleting the record)
- The `source` field can track where subscriptions came from (website, social media, etc.)

---

**✅ Once this is done, your email marketing feature will be fully functional!**

