const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const parseAvailableSizes = (sizeValue) => {
  if (!sizeValue || typeof sizeValue !== 'string') {
    return [];
  }

  const trimmed = sizeValue.trim();
  
  // Check if it's a jersey size object (starts with {)
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Return a flattened list of all jersey sizes
        const allSizes = [];
        if (parsed.shirts) {
          if (Array.isArray(parsed.shirts.adults)) allSizes.push(...parsed.shirts.adults);
          if (Array.isArray(parsed.shirts.kids)) allSizes.push(...parsed.shirts.kids);
        }
        if (parsed.shorts) {
          if (Array.isArray(parsed.shorts.adults)) allSizes.push(...parsed.shorts.adults);
          if (Array.isArray(parsed.shorts.kids)) allSizes.push(...parsed.shorts.kids);
        }
        return allSizes.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim());
      }
    } catch (error) {
      console.warn('Failed to parse jersey sizes:', error.message);
    }
  }
  
  // Check if it's an array (trophy sizes)
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim());
    }
  } catch (error) {
    console.warn('Failed to parse available sizes:', error.message);
  }

  return [];
};

const attachBranchNames = async (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return Array.isArray(products) ? [...products] : [];
  }

  const branchIds = [...new Set(products.map(product => product?.branch_id).filter(Boolean))];
  if (branchIds.length === 0) {
    return products.map(product => ({
      ...product,
      branch_name: null
    }));
  }

  try {
    const { data: branchesData, error: branchesError } = await supabase
      .from('branches')
      .select('id, name')
      .in('id', branchIds);

    if (branchesError) {
      console.error('Error fetching branches:', branchesError);
      return products.map(product => ({
        ...product,
        branch_name: null
      }));
    }

    const branchMap = new Map();
    (branchesData || []).forEach(branch => {
      if (branch?.id) {
        branchMap.set(branch.id, branch.name || null);
      }
    });

    return products.map(product => ({
      ...product,
      branch_name: branchMap.get(product.branch_id) || null
    }));
  } catch (error) {
    console.error('Unexpected error fetching branches:', error);
    return products.map(product => ({
      ...product,
      branch_name: null
    }));
  }
};

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// Helper function to calculate review stats for products
async function calculateProductReviewStats(productIds) {
  if (!productIds || productIds.length === 0) {
    return new Map();
  }

  try {
    // Get product-specific reviews
    const { data: productReviews, error: productReviewsError } = await supabase
      .from('order_reviews')
      .select('product_id, rating')
      .in('product_id', productIds)
      .not('product_id', 'is', null);

    if (productReviewsError) {
      console.error('Error fetching product-specific reviews:', productReviewsError);
    }

    // Get order-level reviews (product_id is null)
    const { data: orderReviews, error: orderReviewsError } = await supabase
      .from('order_reviews')
      .select('order_id, rating')
      .is('product_id', null);

    if (orderReviewsError) {
      console.error('Error fetching order-level reviews:', orderReviewsError);
    }

    // Get delivered orders for order-level reviews
    let deliveredOrders = [];
    if (orderReviews && orderReviews.length > 0) {
      const orderIds = [...new Set(orderReviews.map(r => r.order_id).filter(Boolean))];
      if (orderIds.length > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_items')
          .eq('status', 'picked_up_delivered')
          .in('id', orderIds);

        if (ordersError) {
          console.error('Error fetching delivered orders:', ordersError);
        } else {
          deliveredOrders = ordersData || [];
        }
      }
    }

    // Build map of product ratings
    const ratingsByProduct = new Map();

    const addRating = (productId, rating) => {
      if (!productId || rating === null || rating === undefined) return;
      if (!ratingsByProduct.has(productId)) {
        ratingsByProduct.set(productId, []);
      }
      ratingsByProduct.get(productId).push(rating);
    };

    // Add product-specific reviews
    if (productReviews) {
      for (const review of productReviews) {
        if (review.product_id && review.rating) {
          addRating(review.product_id, review.rating);
        }
      }
    }

    // Add order-level reviews to products in those orders
    if (orderReviews && deliveredOrders.length > 0) {
      const orderMap = new Map();
      for (const order of deliveredOrders) {
        let orderItems = [];
        if (order.order_items) {
          if (Array.isArray(order.order_items)) {
            orderItems = order.order_items;
          } else if (typeof order.order_items === 'string') {
            try {
              orderItems = JSON.parse(order.order_items);
            } catch (e) {
              console.warn('Failed to parse order_items:', e);
            }
          }
        }
        orderMap.set(order.id, orderItems);
      }

      for (const review of orderReviews) {
        const items = orderMap.get(review.order_id) || [];
        for (const item of items) {
          if (item && item.id && productIds.includes(item.id)) {
            addRating(item.id, review.rating);
          }
        }
      }
    }

    // Calculate stats for each product
    const statsMap = new Map();
    for (const [productId, ratings] of ratingsByProduct.entries()) {
      const count = ratings.length;
      const average = count === 0 
        ? 0 
        : Math.round((ratings.reduce((sum, r) => sum + r, 0) / count) * 10) / 10;
      statsMap.set(productId, { review_count: count, average_rating: average });
    }

    return statsMap;
  } catch (error) {
    console.error('Error calculating product review stats:', error);
    return new Map();
  }
}

// Get all products
router.get('/', async (req, res) => {
  try {
    // Check if 'all' query parameter is set to skip deduplication (for inventory management)
    const includeAllBranches = req.query.all === 'true' || req.query.all === '1';
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    const productsWithBranches = await attachBranchNames(data || []);

    // Calculate review stats for all products
    const productIds = (productsWithBranches || []).map(p => p.id).filter(Boolean);
    const reviewStats = await calculateProductReviewStats(productIds);

    // Transform the data to match the expected format
    const transformedData = productsWithBranches.map(product => {
      const stats = reviewStats.get(product.id) || { review_count: 0, average_rating: 0 };
      return {
        ...product,
        available_sizes: parseAvailableSizes(product.size),
        review_count: stats.review_count,
        average_rating: stats.average_rating,
        sold_quantity: product.sold_quantity || 0
      };
    });

    // If includeAllBranches is true, return all products without deduplication (for inventory)
    if (includeAllBranches) {
      return res.json(transformedData);
    }

    // Deduplicate products by name and category for customer-facing display
    // Group products with the same name and category, aggregating stock across all branches
    const productMap = new Map();
    
    transformedData.forEach(product => {
      // Create a unique key from name and category (case-insensitive)
      const key = `${(product.name || '').toLowerCase().trim()}_${(product.category || '').toLowerCase().trim()}`;
      
      if (!productMap.has(key)) {
        // First occurrence of this product - initialize aggregated stock
        let initialSizeStocks = null;
        if (product.size_stocks) {
          if (typeof product.size_stocks === 'string') {
            try {
              initialSizeStocks = JSON.parse(product.size_stocks);
            } catch (e) {
              initialSizeStocks = null;
            }
          } else {
            initialSizeStocks = product.size_stocks;
          }
        }
        
        // Initialize stock - if stock_quantity is null/undefined, check if we should use 0 or calculate from size_stocks
        let initialStockQty = 0;
        if (product.stock_quantity !== null && product.stock_quantity !== undefined) {
          initialStockQty = product.stock_quantity;
        } else if (initialSizeStocks && typeof initialSizeStocks === 'object') {
          // For trophies with size_stocks but null stock_quantity, calculate from size_stocks
          initialStockQty = Object.values(initialSizeStocks).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
        } else {
          // No stock_quantity and no size_stocks, default to 0
          initialStockQty = 0;
        }
        
        const aggregatedProduct = {
          ...product,
          aggregated_stock_quantity: initialStockQty,
          aggregated_size_stocks: initialSizeStocks
        };
        productMap.set(key, aggregatedProduct);
      } else {
        // Product already exists - aggregate stock from all branches
        const existing = productMap.get(key);
        const current = product;
        
        // Aggregate stock_quantity for balls and simple products
        if (current.stock_quantity !== null && current.stock_quantity !== undefined) {
          existing.aggregated_stock_quantity = (existing.aggregated_stock_quantity || 0) + current.stock_quantity;
        }
        
        // Aggregate size_stocks for trophies
        if (current.size_stocks) {
          let currentSizeStocks = current.size_stocks;
          if (typeof currentSizeStocks === 'string') {
            try {
              currentSizeStocks = JSON.parse(currentSizeStocks);
            } catch (e) {
              currentSizeStocks = null;
            }
          }
          
          if (currentSizeStocks && typeof currentSizeStocks === 'object') {
            if (!existing.aggregated_size_stocks) {
              existing.aggregated_size_stocks = {};
            }
            
            // Sum stock for each size across all branches
            Object.keys(currentSizeStocks).forEach(size => {
              const currentQty = parseInt(currentSizeStocks[size]) || 0;
              const existingQty = parseInt(existing.aggregated_size_stocks[size]) || 0;
              existing.aggregated_size_stocks[size] = existingQty + currentQty;
            });
          }
        }
      }
    });
    
    // Now calculate final stock_quantity for all products after aggregation
    productMap.forEach((product, key) => {
      // For trophies, calculate total from aggregated_size_stocks
      if (product.aggregated_size_stocks && typeof product.aggregated_size_stocks === 'object' && !Array.isArray(product.aggregated_size_stocks)) {
        const totalTrophyStock = Object.values(product.aggregated_size_stocks).reduce(
          (sum, qty) => sum + (parseInt(qty) || 0), 
          0
        );
        product.stock_quantity = totalTrophyStock;
        console.log(`📦 [Products API] Trophy ${product.name}: Calculated stock from size_stocks = ${totalTrophyStock}`, product.aggregated_size_stocks);
      } else {
        // For balls and other products, use aggregated_stock_quantity
        product.stock_quantity = product.aggregated_stock_quantity !== undefined && product.aggregated_stock_quantity !== null 
          ? product.aggregated_stock_quantity 
          : (product.stock_quantity || 0);
        if (product.category?.toLowerCase() === 'balls' || product.category?.toLowerCase() === 'trophies') {
          console.log(`📦 [Products API] ${product.category} ${product.name}: Final stock_quantity = ${product.stock_quantity}, aggregated_stock_quantity = ${product.aggregated_stock_quantity}`);
        }
      }
    });
    
    // Convert map back to array and clean up aggregated fields
    const deduplicatedData = Array.from(productMap.values()).map(product => {
      // Remove aggregated fields from the product object
      const { aggregated_stock_quantity, aggregated_size_stocks, ...cleanProduct } = product;
      
      return {
        ...cleanProduct,
        stock_quantity: product.stock_quantity !== undefined && product.stock_quantity !== null ? product.stock_quantity : 0,
        size_stocks: aggregated_size_stocks || product.size_stocks
      };
    });

    res.json(deduplicatedData);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get products by branch
router.get('/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    const productsWithBranches = await attachBranchNames(data || []);

    // Calculate review stats for all products
    const productIds = productsWithBranches.map(p => p.id).filter(Boolean);
    const reviewStats = await calculateProductReviewStats(productIds);

    // Transform the data
    const transformedData = productsWithBranches.map(product => {
      const stats = reviewStats.get(product.id) || { review_count: 0, average_rating: 0 };
      return {
        ...product,
        available_sizes: parseAvailableSizes(product.size),
        review_count: stats.review_count,
        average_rating: stats.average_rating,
        sold_quantity: product.sold_quantity || 0
      };
    });

    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching products by branch:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [productWithBranch] = await attachBranchNames([product]);

    // Calculate review stats for this product
    const reviewStats = await calculateProductReviewStats([id]);
    const stats = reviewStats.get(id) || { review_count: 0, average_rating: 0 };

    const transformedData = {
      ...productWithBranch,
      available_sizes: parseAvailableSizes(productWithBranch.size),
      review_count: stats.review_count,
      average_rating: stats.average_rating,
      sold_quantity: productWithBranch.sold_quantity || 0
    };
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new product
router.post('/', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {
    const { 
      name, 
      category, 
      size, 
      price, 
      description, 
      main_image, 
      additional_images, 
      stock_quantity, 
      sold_quantity,
      branch_id,
      size_stocks
    } = req.body;

    console.log('📦 [Products API] Creating product with data:', {
      name,
      category,
      size
    });

    // Handle price - parse as float
    const priceValue = parseFloat(price);

    // Handle jersey_prices - ensure it's properly formatted as JSONB
    let jerseyPricesValue = null;
    if (req.body.jersey_prices) {
      // If it's already an object, use it directly; if it's a string, parse it
      if (typeof req.body.jersey_prices === 'string') {
        try {
          jerseyPricesValue = JSON.parse(req.body.jersey_prices);
        } catch (e) {
          console.error('❌ [Products API] Error parsing jersey_prices string:', e);
          jerseyPricesValue = req.body.jersey_prices;
        }
      } else {
        jerseyPricesValue = req.body.jersey_prices;
      }
      console.log('📦 [Products API] Received jersey_prices:', jerseyPricesValue);
      console.log('📦 [Products API] Type of jersey_prices:', typeof jerseyPricesValue);
      console.log('📦 [Products API] jersey_prices content:', JSON.stringify(jerseyPricesValue, null, 2));
    }

    // Handle trophy_prices - ensure it's properly formatted as JSONB
    let trophyPricesValue = null;
    if (req.body.trophy_prices) {
      // If it's already an object, use it directly; if it's a string, parse it
      if (typeof req.body.trophy_prices === 'string') {
        try {
          trophyPricesValue = JSON.parse(req.body.trophy_prices);
        } catch (e) {
          console.error('❌ [Products API] Error parsing trophy_prices string:', e);
          trophyPricesValue = req.body.trophy_prices;
        }
      } else {
        trophyPricesValue = req.body.trophy_prices;
      }
      console.log('🏆 [Products API] Received trophy_prices:', trophyPricesValue);
      console.log('🏆 [Products API] Type of trophy_prices:', typeof trophyPricesValue);
      console.log('🏆 [Products API] trophy_prices content:', JSON.stringify(trophyPricesValue, null, 2));
    }

    // Handle size_surcharges - ensure JSONB
    let sizeSurchargesValue = null;
    if (req.body.size_surcharges !== undefined) {
      if (typeof req.body.size_surcharges === 'string' && req.body.size_surcharges.trim() !== '') {
        try {
          sizeSurchargesValue = JSON.parse(req.body.size_surcharges);
        } catch (e) {
          console.error('❌ [Products API] Error parsing size_surcharges string:', e);
          sizeSurchargesValue = req.body.size_surcharges;
        }
      } else if (typeof req.body.size_surcharges === 'object' && req.body.size_surcharges !== null) {
        sizeSurchargesValue = req.body.size_surcharges;
      }
    }

    // Handle fabric_surcharges - ensure JSONB
    let fabricSurchargesValue = null;
    if (req.body.fabric_surcharges !== undefined) {
      if (typeof req.body.fabric_surcharges === 'string' && req.body.fabric_surcharges.trim() !== '') {
        try {
          fabricSurchargesValue = JSON.parse(req.body.fabric_surcharges);
        } catch (e) {
          console.error('❌ [Products API] Error parsing fabric_surcharges string:', e);
          fabricSurchargesValue = req.body.fabric_surcharges;
        }
      } else if (typeof req.body.fabric_surcharges === 'object' && req.body.fabric_surcharges !== null) {
        fabricSurchargesValue = req.body.fabric_surcharges;
      }
    }

    // Branch validation for admins
    let finalBranchId = branch_id ? parseInt(branch_id) : 1;
    
    // Admins can only create products for their assigned branch
    if (req.user.role === 'admin' && req.user.branch_id) {
      // If admin has a branch_id, they can only create products for that branch
      if (branch_id && parseInt(branch_id) !== parseInt(req.user.branch_id)) {
        return res.status(403).json({ 
          error: 'You can only create products for your assigned branch' 
        });
      }
      // Always use admin's branch_id (override any provided branch_id)
      finalBranchId = parseInt(req.user.branch_id);
    }

    // Build insert data object
    const insertData = {
      name,
      category,
      size,
      price: priceValue,
      description,
      main_image,
      additional_images: additional_images || [],
      stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
      sold_quantity: sold_quantity ? parseInt(sold_quantity) : 0,
      branch_id: finalBranchId
    };
    
    // Only add jersey_prices if it's not null (Supabase handles null differently)
    if (jerseyPricesValue !== null && jerseyPricesValue !== undefined) {
      insertData.jersey_prices = jerseyPricesValue;
    }
    
    // Only add trophy_prices if it's not null
    if (trophyPricesValue !== null && trophyPricesValue !== undefined) {
      insertData.trophy_prices = trophyPricesValue;
    }

    if (sizeSurchargesValue !== null && sizeSurchargesValue !== undefined) {
      insertData.size_surcharges = sizeSurchargesValue;
    }

    if (fabricSurchargesValue !== null && fabricSurchargesValue !== undefined) {
      insertData.fabric_surcharges = fabricSurchargesValue;
    }

    // Handle size_stocks - per-size stock quantities (for trophies with sizes)
    let sizeStocksValue = null;
    if (size_stocks !== undefined && size_stocks !== null) {
      if (typeof size_stocks === 'string' && size_stocks.trim() !== '') {
        try {
          sizeStocksValue = JSON.parse(size_stocks);
        } catch (e) {
          console.error('❌ [Products API] Error parsing size_stocks string:', e);
          sizeStocksValue = null;
        }
      } else if (typeof size_stocks === 'object' && size_stocks !== null) {
        sizeStocksValue = size_stocks;
      }
    }
    if (sizeStocksValue !== null && sizeStocksValue !== undefined) {
      insertData.size_stocks = sizeStocksValue;
      console.log('📦 [Products API] size_stocks being saved:', JSON.stringify(sizeStocksValue, null, 2));
      console.log('📦 [Products API] size_stocks type:', typeof sizeStocksValue, Array.isArray(sizeStocksValue) ? '(array)' : '(object)');
    } else {
      console.log('📦 [Products API] No size_stocks to save (value is null/undefined)');
    }

    console.log('📦 [Products API] Final insert data:', JSON.stringify(insertData, null, 2));
    console.log('📦 [Products API] size_stocks in insertData:', insertData.size_stocks);
    console.log('📦 [Products API] jersey_prices in insertData:', insertData.jersey_prices);

    // Check if product with same name, category, and branch_id already exists
    // For balls, trophies, and medals, we want to allow multiple branches but prevent duplicates within the same branch
    // Use case-insensitive matching for category to prevent duplicates due to case differences
    console.log('📦 [Products API] Checking for existing product:', {
      name: insertData.name,
      category: insertData.category,
      branch_id: insertData.branch_id
    });
    
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('id, branch_id, name, category')
      .eq('name', insertData.name.trim()) // Trim whitespace from name
      .ilike('category', insertData.category.trim()) // Case-insensitive category match
      .eq('branch_id', insertData.branch_id);
    
    // Find the best match (prefer one with size_stocks if available, or just take the first)
    let existingProduct = null;
    if (existingProducts && existingProducts.length > 0) {
      // Prefer a product that already has size_stocks populated (for trophies)
      if (insertData.size_stocks) {
        const { data: productsWithSizeStocks } = await supabase
          .from('products')
          .select('id, branch_id, name, category, size_stocks')
          .in('id', existingProducts.map(p => p.id))
          .not('size_stocks', 'is', null);
        
        if (productsWithSizeStocks && productsWithSizeStocks.length > 0) {
          existingProduct = productsWithSizeStocks[0];
          console.log('📦 [Products API] Found existing product with size_stocks:', existingProduct.id);
        } else {
          existingProduct = existingProducts[0];
          console.log('📦 [Products API] Found existing product (no size_stocks):', existingProduct.id);
        }
      } else {
        existingProduct = existingProducts[0];
        console.log('📦 [Products API] Found existing product:', existingProduct.id);
      }
      
      if (existingProducts.length > 1) {
        console.warn(`⚠️ [Products API] WARNING: Found ${existingProducts.length} duplicate products with same name/category/branch!`);
        console.warn(`   This indicates duplicate products exist in the database. Consider cleaning them up.`);
      }
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing product:', checkError);
      return res.status(500).json({ error: 'Failed to check for existing product' });
    }

    let data;
    let error;

    if (existingProduct) {
      // Update existing product instead of creating duplicate
      console.log('📦 [Products API] Product exists in branch', insertData.branch_id, ', updating:', existingProduct.id);
      const { data: updateData, error: updateError } = await supabase
        .from('products')
        .update({
          ...insertData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProduct.id)
        .select('*')
        .single();
      
      data = updateData;
      error = updateError;
      
      if (updateError) {
        console.error('❌ Error updating product:', updateError);
        console.error('❌ Update data that failed:', JSON.stringify(insertData, null, 2));
      } else {
        console.log('✅ [Products API] Product updated successfully in branch', insertData.branch_id);
        console.log('✅ [Products API] Product ID:', data?.id);
        // Confirm size_stocks was saved
        if (insertData.size_stocks !== undefined) {
          console.log('✅ [Products API] ✅ CONFIRMED: size_stocks was sent to database:', JSON.stringify(insertData.size_stocks, null, 2));
          console.log('✅ [Products API] ✅ CONFIRMED: size_stocks in database response:', JSON.stringify(data?.size_stocks, null, 2));
          if (data?.size_stocks) {
            console.log('✅ [Products API] ✅✅✅ SUCCESS: size_stocks column was updated in Supabase!');
          } else {
            console.warn('⚠️ [Products API] ⚠️ WARNING: size_stocks was sent but response shows null/undefined');
          }
        } else {
          console.log('ℹ️ [Products API] No size_stocks in update data (not a trophy product with sizes)');
        }
      }
    } else {
      // Create new product
      console.log('📦 [Products API] Creating new product for branch', insertData.branch_id);
      const { data: insertResult, error: insertError } = await supabase
        .from('products')
        .insert(insertData)
        .select('*')
        .single();
      
      data = insertResult;
      error = insertError;
      
      if (insertError) {
        console.error('❌ Error inserting product:', insertError);
        console.error('❌ Insert data that failed:', JSON.stringify(insertData, null, 2));
      } else {
        console.log('✅ [Products API] Product created successfully in branch', insertData.branch_id);
        console.log('✅ [Products API] Product ID:', data?.id);
        // Confirm size_stocks was saved
        if (insertData.size_stocks !== undefined) {
          console.log('✅ [Products API] ✅ CONFIRMED: size_stocks was sent to database:', JSON.stringify(insertData.size_stocks, null, 2));
          console.log('✅ [Products API] ✅ CONFIRMED: size_stocks in database response:', JSON.stringify(data?.size_stocks, null, 2));
          if (data?.size_stocks) {
            console.log('✅ [Products API] ✅✅✅ SUCCESS: size_stocks column was updated in Supabase!');
          } else {
            console.warn('⚠️ [Products API] ⚠️ WARNING: size_stocks was sent but response shows null/undefined');
          }
        } else {
          console.log('ℹ️ [Products API] No size_stocks in insert data (not a trophy product with sizes)');
        }
      }
    }

    // If error is specifically about missing size_stocks column in schema cache, retry without it
    if (error && error.message?.includes("Could not find the 'size_stocks' column") && error.message?.includes('schema cache')) {
      console.warn('⚠️ [Products API] size_stocks column not found in schema cache, retrying without it');
      const insertDataWithoutSizeStocks = { ...insertData };
      delete insertDataWithoutSizeStocks.size_stocks;
      
      if (existingProduct) {
        const { data: updateData, error: updateError } = await supabase
          .from('products')
          .update({
            ...insertDataWithoutSizeStocks,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProduct.id)
          .select('*')
          .single();
        
        data = updateData;
        error = updateError;
      } else {
        const { data: insertResult, error: insertError } = await supabase
          .from('products')
          .insert(insertDataWithoutSizeStocks)
          .select('*')
          .single();
        
        data = insertResult;
        error = insertError;
      }
    }

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      console.error('❌ Data that failed:', JSON.stringify(insertData, null, 2));
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ [Products API] Product inserted successfully');
    console.log('✅ [Products API] Inserted product jersey_prices:', data?.jersey_prices);
    console.log('✅ [Products API] Inserted product size_surcharges:', data?.size_surcharges);
    console.log('✅ [Products API] Inserted product fabric_surcharges:', data?.fabric_surcharges);

    // If admin created the product, also create it for all other branches with 0 stock
    if (req.user.role === 'admin' && req.user.branch_id && data) {
      try {
        // Fetch all branches
        const { data: allBranches, error: branchesError } = await supabase
          .from('branches')
          .select('id')
          .order('id');

        if (branchesError) {
          console.error('❌ [Products API] Error fetching branches for multi-branch creation:', branchesError);
        } else if (allBranches && allBranches.length > 0) {
          const adminBranchId = parseInt(req.user.branch_id);
          const otherBranches = allBranches.filter(b => b.id !== adminBranchId);

          console.log(`📦 [Products API] Creating product for ${otherBranches.length} other branches with 0 stock`);

          // Create product for each other branch with 0 stock
          for (const branch of otherBranches) {
            const otherBranchInsertData = {
              ...insertData,
              branch_id: branch.id,
              stock_quantity: 0, // Always 0 stock for other branches
              sold_quantity: 0
            };

            // For trophy products with size_stocks, set all sizes to 0
            // size_stocks structure can be:
            // - { branchId: { size: quantity } } - nested per branch
            // - { size: quantity } - flat structure (single branch)
            if (insertData.size_stocks && typeof insertData.size_stocks === 'object') {
              let zeroSizeStocks = {};
              let sizesToZero = [];
              
              // Extract sizes from the admin's size_stocks
              // Check if nested structure { branchId: { size: quantity } }
              const branchKeys = Object.keys(insertData.size_stocks);
              if (branchKeys.length > 0) {
                const firstBranchKey = branchKeys[0];
                const firstBranchData = insertData.size_stocks[firstBranchKey];
                
                if (firstBranchData && typeof firstBranchData === 'object') {
                  // Nested structure - extract sizes from first branch (admin's branch)
                  sizesToZero = Object.keys(firstBranchData);
                } else {
                  // Flat structure { size: quantity } - use all keys as sizes
                  sizesToZero = branchKeys;
                }
              }
              
              // Create zero stocks for all sizes
              sizesToZero.forEach(size => {
                zeroSizeStocks[size] = 0;
              });
              
              // Set size_stocks with nested structure for this branch
              if (Object.keys(zeroSizeStocks).length > 0) {
                otherBranchInsertData.size_stocks = { [branch.id.toString()]: zeroSizeStocks };
              }
            } else {
              // Clear size_stocks for non-trophy products or if not set
              if (otherBranchInsertData.size_stocks) {
                delete otherBranchInsertData.size_stocks;
              }
            }

            // Check if product already exists in this branch
            const { data: existingProducts } = await supabase
              .from('products')
              .select('id')
              .eq('name', insertData.name.trim())
              .ilike('category', insertData.category.trim())
              .eq('branch_id', branch.id)
              .limit(1);

            if (!existingProducts || existingProducts.length === 0) {
              // Create product for this branch
              const { error: branchInsertError } = await supabase
                .from('products')
                .insert(otherBranchInsertData);

              if (branchInsertError) {
                console.error(`❌ [Products API] Error creating product for branch ${branch.id}:`, branchInsertError);
              } else {
                console.log(`✅ [Products API] Created product for branch ${branch.id} with 0 stock`);
              }
            } else {
              console.log(`⚠️ [Products API] Product already exists in branch ${branch.id}, skipping`);
            }
          }
        }
      } catch (multiBranchError) {
        console.error('❌ [Products API] Error creating products for other branches:', multiBranchError);
        // Don't fail the request if multi-branch creation fails - the main product was created successfully
      }
    }

    // Transform the data to match the expected format
    const [productWithBranch] = await attachBranchNames([data]);
    const transformedData = {
      ...productWithBranch,
      available_sizes: parseAvailableSizes(productWithBranch.size)
    };

    res.status(201).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      category, 
      size, 
      price, 
      description, 
      main_image, 
      additional_images, 
      stock_quantity, 
      sold_quantity,
      branch_id,
      size_stocks
    } = req.body;

    // Check if admin is trying to update a product from another branch
    if (req.user.role === 'admin' && req.user.branch_id) {
      // First, fetch the existing product to check its branch_id
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('id, branch_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Admin can only update products from their assigned branch
      if (existingProduct.branch_id !== parseInt(req.user.branch_id)) {
        return res.status(403).json({ 
          error: 'You can only update products from your assigned branch' 
        });
      }

      // Also check if they're trying to change the branch_id to a different branch
      const newBranchId = branch_id ? parseInt(branch_id) : existingProduct.branch_id;
      if (newBranchId !== parseInt(req.user.branch_id)) {
        return res.status(403).json({ 
          error: 'You cannot change the product branch or assign it to a different branch' 
        });
      }
    }

    const soldQuantityValue = sold_quantity === '' || sold_quantity === null || sold_quantity === undefined ? 0 : parseInt(sold_quantity);
    
    console.log('📦 [Products API] Updating product:', {
      id,
      size
    });
    
    // Handle price - parse as float
    const priceValue = parseFloat(price);

    // Handle jersey_prices - ensure it's properly formatted as JSONB
    let jerseyPricesValue = null;
    if (req.body.jersey_prices) {
      // If it's already an object, use it directly; if it's a string, parse it
      if (typeof req.body.jersey_prices === 'string') {
        try {
          jerseyPricesValue = JSON.parse(req.body.jersey_prices);
        } catch (e) {
          console.error('❌ [Products API] Error parsing jersey_prices string:', e);
          jerseyPricesValue = req.body.jersey_prices;
        }
      } else {
        jerseyPricesValue = req.body.jersey_prices;
      }
      console.log('📦 [Products API] Received jersey_prices for update:', jerseyPricesValue);
      console.log('📦 [Products API] Type of jersey_prices:', typeof jerseyPricesValue);
      console.log('📦 [Products API] jersey_prices content:', JSON.stringify(jerseyPricesValue, null, 2));
    }

    // Handle trophy_prices - ensure it's properly formatted as JSONB
    let trophyPricesValue = null;
    if (req.body.trophy_prices) {
      // If it's already an object, use it directly; if it's a string, parse it
      if (typeof req.body.trophy_prices === 'string') {
        try {
          trophyPricesValue = JSON.parse(req.body.trophy_prices);
        } catch (e) {
          console.error('❌ [Products API] Error parsing trophy_prices string:', e);
          trophyPricesValue = req.body.trophy_prices;
        }
      } else {
        trophyPricesValue = req.body.trophy_prices;
      }
      console.log('🏆 [Products API] Received trophy_prices for update:', trophyPricesValue);
      console.log('🏆 [Products API] Type of trophy_prices:', typeof trophyPricesValue);
      console.log('🏆 [Products API] trophy_prices content:', JSON.stringify(trophyPricesValue, null, 2));
    }

    // Handle size_surcharges - ensure JSONB
    let sizeSurchargesValue = null;
    if (req.body.size_surcharges !== undefined) {
      if (typeof req.body.size_surcharges === 'string' && req.body.size_surcharges.trim() !== '') {
        try {
          sizeSurchargesValue = JSON.parse(req.body.size_surcharges);
        } catch (e) {
          console.error('❌ [Products API] Error parsing size_surcharges string:', e);
          sizeSurchargesValue = req.body.size_surcharges;
        }
      } else if (typeof req.body.size_surcharges === 'object' && req.body.size_surcharges !== null) {
        sizeSurchargesValue = req.body.size_surcharges;
      } else if (req.body.size_surcharges === null) {
        sizeSurchargesValue = null;
      }
    }

    // Handle fabric_surcharges - ensure JSONB
    let fabricSurchargesValue = null;
    if (req.body.fabric_surcharges !== undefined) {
      if (typeof req.body.fabric_surcharges === 'string' && req.body.fabric_surcharges.trim() !== '') {
        try {
          fabricSurchargesValue = JSON.parse(req.body.fabric_surcharges);
        } catch (e) {
          console.error('❌ [Products API] Error parsing fabric_surcharges string:', e);
          fabricSurchargesValue = req.body.fabric_surcharges;
        }
      } else if (typeof req.body.fabric_surcharges === 'object' && req.body.fabric_surcharges !== null) {
        fabricSurchargesValue = req.body.fabric_surcharges;
      } else if (req.body.fabric_surcharges === null) {
        fabricSurchargesValue = null;
      }
    }

    // Build update data object
    let finalBranchId = branch_id ? parseInt(branch_id) : 1;
    
    // Enforce branch restriction for admins in update data
    if (req.user.role === 'admin' && req.user.branch_id) {
      // Admin can only update their own branch's products, so ensure branch_id matches
      finalBranchId = parseInt(req.user.branch_id);
    }
    
    const updateData = {
      name,
      category,
      size,
      price: priceValue,
      description,
      main_image,
      additional_images: additional_images || [],
      stock_quantity: (stock_quantity !== null && stock_quantity !== undefined && stock_quantity !== '') 
        ? parseInt(stock_quantity) 
        : 0,  // Overwrite to 0 if not provided (don't append)
      sold_quantity: soldQuantityValue,
      branch_id: finalBranchId,
      updated_at: new Date().toISOString()
    };
    
    // Only add jersey_prices if it's not null (Supabase handles null differently)
    // For updates, we need to explicitly set it even if null to clear it, or omit it to keep existing value
    if (jerseyPricesValue !== null && jerseyPricesValue !== undefined) {
      updateData.jersey_prices = jerseyPricesValue;
    } else if (req.body.hasOwnProperty('jersey_prices') && req.body.jersey_prices === null) {
      // Explicitly set to null if the request wants to clear it
      updateData.jersey_prices = null;
    }
    
    // Only add trophy_prices if it's not null
    if (trophyPricesValue !== null && trophyPricesValue !== undefined) {
      updateData.trophy_prices = trophyPricesValue;
    } else if (req.body.hasOwnProperty('trophy_prices') && req.body.trophy_prices === null) {
      // Explicitly set to null if the request wants to clear it
      updateData.trophy_prices = null;
    }

    if (sizeSurchargesValue !== null && sizeSurchargesValue !== undefined) {
      updateData.size_surcharges = sizeSurchargesValue;
    } else if (req.body.hasOwnProperty('size_surcharges') && req.body.size_surcharges === null) {
      updateData.size_surcharges = null;
    }

    if (fabricSurchargesValue !== null && fabricSurchargesValue !== undefined) {
      updateData.fabric_surcharges = fabricSurchargesValue;
    } else if (req.body.hasOwnProperty('fabric_surcharges') && req.body.fabric_surcharges === null) {
      updateData.fabric_surcharges = null;
    }

    // Handle size_stocks - per-size stock quantities (for trophies with sizes)
    let sizeStocksValue = null;
    if (size_stocks !== undefined && size_stocks !== null) {
      if (typeof size_stocks === 'string' && size_stocks.trim() !== '') {
        try {
          sizeStocksValue = JSON.parse(size_stocks);
        } catch (e) {
          console.error('❌ [Products API] Error parsing size_stocks string:', e);
          sizeStocksValue = null;
        }
      } else if (typeof size_stocks === 'object' && size_stocks !== null) {
        sizeStocksValue = size_stocks;
      }
    }
    if (sizeStocksValue !== null && sizeStocksValue !== undefined) {
      updateData.size_stocks = sizeStocksValue;
      console.log('📦 [Products API] size_stocks being updated:', JSON.stringify(sizeStocksValue, null, 2));
      console.log('📦 [Products API] size_stocks type:', typeof sizeStocksValue, Array.isArray(sizeStocksValue) ? '(array)' : '(object)');
    } else if (req.body.hasOwnProperty('size_stocks') && req.body.size_stocks === null) {
      // Explicitly set to null if the request wants to clear it
      updateData.size_stocks = null;
      console.log('📦 [Products API] Clearing size_stocks (setting to null)');
    } else {
      console.log('📦 [Products API] No size_stocks to update (value is null/undefined)');
    }

    console.log('📦 [Products API] Final update data:', JSON.stringify(updateData, null, 2));
    console.log('📦 [Products API] size_stocks in updateData:', updateData.size_stocks);
    console.log('📦 [Products API] jersey_prices in updateData:', updateData.jersey_prices);
    
    console.log('📦 [Products API] About to update in Supabase with data:', JSON.stringify(updateData, null, 2));
    
    // Update the product using Supabase
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    // If error is specifically about missing size_stocks column in schema cache, retry without it
    if (error && error.message?.includes("Could not find the 'size_stocks' column") && error.message?.includes('schema cache')) {
      console.warn('⚠️ [Products API] size_stocks column not found in schema cache, retrying update without it');
      const updateDataWithoutSizeStocks = { ...updateData };
      delete updateDataWithoutSizeStocks.size_stocks;
      
      const { data: retryData, error: retryError } = await supabase
        .from('products')
        .update(updateDataWithoutSizeStocks)
        .eq('id', id)
        .select('*')
        .single();
      
      if (retryError) {
        error = retryError;
      } else {
        data = retryData;
        error = null;
      }
    }

    if (error) {
      console.error('❌ Supabase update error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      console.error('❌ Update data that failed:', JSON.stringify(updateData, null, 2));
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Confirm size_stocks was saved
    if (updateData.size_stocks !== undefined) {
      console.log('✅ [Products API] ✅ CONFIRMED: size_stocks was sent to database:', JSON.stringify(updateData.size_stocks, null, 2));
      console.log('✅ [Products API] ✅ CONFIRMED: size_stocks in database response:', JSON.stringify(data?.size_stocks, null, 2));
      if (data?.size_stocks) {
        console.log('✅ [Products API] ✅✅✅ SUCCESS: size_stocks column was updated in Supabase!');
        console.log('✅ [Products API] Product ID:', data.id, 'Branch ID:', data.branch_id);
      } else {
        console.warn('⚠️ [Products API] ⚠️ WARNING: size_stocks was sent but response shows null/undefined');
        console.warn('⚠️ [Products API] This might indicate the column does not exist or there was an issue saving it');
      }
    } else {
      console.log('ℹ️ [Products API] No size_stocks in update data (not a trophy product with sizes)');
    }

    console.log('✅ [Products API] Product updated successfully');
    console.log('✅ [Products API] Updated product size_surcharges:', data?.size_surcharges);
    console.log('✅ [Products API] Updated product fabric_surcharges:', data?.fabric_surcharges);

    // Transform the data to match the expected format
    const [productWithBranch] = await attachBranchNames([data]);
    const transformedData = {
      ...productWithBranch,
      available_sizes: parseAvailableSizes(productWithBranch.size)
    };

    res.json(transformedData);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
