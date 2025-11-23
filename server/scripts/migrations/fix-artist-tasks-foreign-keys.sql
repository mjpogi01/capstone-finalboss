    -- Migration: Fix foreign key constraints for artist_tasks table
    -- Purpose: Ensure PostgREST can recognize the relationships between artist_tasks and orders/products
    -- Safe to run multiple times

    -- First, verify that referenced tables exist and have primary keys
    -- This is a safety check - if tables don't exist or don't have PKs, we'll skip the FK creation
    DO $$ 
    DECLARE
    orders_has_pk BOOLEAN := FALSE;
    products_has_pk BOOLEAN := FALSE;
    BEGIN
    -- Check if orders table exists and has a primary key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
            AND rel.relname = 'orders'
            AND con.contype = 'p'
        ) INTO orders_has_pk;
        
        IF NOT orders_has_pk THEN
        RAISE WARNING 'Orders table exists but does not have a primary key constraint. Cannot create foreign key.';
        END IF;
    ELSE
        RAISE WARNING 'Orders table does not exist. Skipping foreign key creation.';
    END IF;

    -- Check if products table exists and has a primary key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
            AND rel.relname = 'products'
            AND con.contype = 'p'
        ) INTO products_has_pk;
        
        IF NOT products_has_pk THEN
        RAISE WARNING 'Products table exists but does not have a primary key constraint. Cannot create foreign key.';
        END IF;
    ELSE
        RAISE WARNING 'Products table does not exist. Skipping foreign key creation.';
    END IF;
    END $$;

    -- Drop existing foreign key constraints if they exist (they might not have proper names)
    DO $$ 
    BEGIN
    -- Drop order_id foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public'
        AND table_name = 'artist_tasks' 
        AND constraint_name LIKE '%order_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE artist_tasks DROP CONSTRAINT IF EXISTS artist_tasks_order_id_fkey;
    END IF;

    -- Drop product_id foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public'
        AND table_name = 'artist_tasks' 
        AND constraint_name LIKE '%product_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE artist_tasks DROP CONSTRAINT IF EXISTS artist_tasks_product_id_fkey;
    END IF;
    END $$;

    -- Add properly named foreign key constraints
    -- This ensures PostgREST can recognize the relationships
    -- Only add if the referenced tables exist AND have primary keys

    DO $$ 
    DECLARE
    orders_has_pk BOOLEAN := FALSE;
    products_has_pk BOOLEAN := FALSE;
    BEGIN
    -- Check if orders table exists and has primary key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
            AND rel.relname = 'orders'
            AND con.contype = 'p'
        ) INTO orders_has_pk;
    END IF;

    -- Check if products table exists and has primary key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
            AND rel.relname = 'products'
            AND con.contype = 'p'
        ) INTO products_has_pk;
    END IF;

    -- Foreign key for orders (only if orders table exists and has PK)
    IF orders_has_pk THEN
        BEGIN
        ALTER TABLE artist_tasks
            ADD CONSTRAINT artist_tasks_order_id_fkey 
            FOREIGN KEY (order_id) 
            REFERENCES orders(id) 
            ON DELETE SET NULL;
        RAISE NOTICE 'Successfully created foreign key: artist_tasks_order_id_fkey';
        EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key artist_tasks_order_id_fkey already exists';
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create foreign key artist_tasks_order_id_fkey: %', SQLERRM;
        END;
    ELSE
        RAISE WARNING 'Skipping foreign key creation for orders - table does not exist or lacks primary key';
    END IF;

    -- Foreign key for products (only if products table exists and has PK)
    IF products_has_pk THEN
        BEGIN
        ALTER TABLE artist_tasks
            ADD CONSTRAINT artist_tasks_product_id_fkey 
            FOREIGN KEY (product_id) 
            REFERENCES products(id) 
            ON DELETE SET NULL;
        RAISE NOTICE 'Successfully created foreign key: artist_tasks_product_id_fkey';
        EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key artist_tasks_product_id_fkey already exists';
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create foreign key artist_tasks_product_id_fkey: %', SQLERRM;
        END;
    ELSE
        RAISE WARNING 'Skipping foreign key creation for products - table does not exist or lacks primary key';
    END IF;
    END $$;

    -- Add indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_artist_tasks_order_id ON artist_tasks(order_id);
    CREATE INDEX IF NOT EXISTS idx_artist_tasks_product_id ON artist_tasks(product_id);

    -- Note: After running this migration, you may need to refresh PostgREST's schema cache
    -- In Supabase, this is usually done automatically, but you can also restart the PostgREST service
    -- or wait a few minutes for the cache to refresh

