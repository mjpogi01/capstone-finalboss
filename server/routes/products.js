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

    // Deduplicate products by name and category for customer-facing display
    // Group products with the same name and category, keeping the one with:
    // 1. Highest stock_quantity (if available)
    // 2. Most recent created_at
    // 3. First one found if both are equal
    const productMap = new Map();
    
    transformedData.forEach(product => {
      // Create a unique key from name and category (case-insensitive)
      const key = `${(product.name || '').toLowerCase().trim()}_${(product.category || '').toLowerCase().trim()}`;
      
      if (!productMap.has(key)) {
        // First occurrence of this product
        productMap.set(key, product);
      } else {
        // Product already exists, compare and keep the better one
        const existing = productMap.get(key);
        const current = product;
        
        // Prefer product with higher stock_quantity (if both have it)
        const existingStock = existing.stock_quantity || 0;
        const currentStock = current.stock_quantity || 0;
        
        if (currentStock > existingStock) {
          productMap.set(key, current);
        } else if (currentStock === existingStock) {
          // If stock is equal, prefer the one with more recent created_at
          const existingDate = new Date(existing.created_at || 0);
          const currentDate = new Date(current.created_at || 0);
          if (currentDate > existingDate) {
            productMap.set(key, current);
          }
        }
        // Otherwise keep existing
      }
    });

    // Convert map back to array
    const deduplicatedData = Array.from(productMap.values());

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
      branch_id 
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
      branch_id: branch_id ? parseInt(branch_id) : 1
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

    console.log('📦 [Products API] Final insert data:', insertData);
    console.log('📦 [Products API] jersey_prices in insertData:', insertData.jersey_prices);

    // Check if product with same name, category, and branch_id already exists
    // For balls, trophies, and medals, we want to allow multiple branches but prevent duplicates within the same branch
    console.log('📦 [Products API] Checking for existing product:', {
      name: insertData.name,
      category: insertData.category,
      branch_id: insertData.branch_id
    });
    
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id, branch_id, name, category')
      .eq('name', insertData.name)
      .eq('category', insertData.category)
      .eq('branch_id', insertData.branch_id)
      .maybeSingle();

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
      } else {
        console.log('✅ [Products API] Product updated successfully in branch', insertData.branch_id);
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
      } else {
        console.log('✅ [Products API] Product created successfully in branch', insertData.branch_id);
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
router.put('/:id', async (req, res) => {
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
      branch_id 
    } = req.body;

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
    const updateData = {
      name,
      category,
      size,
      price: priceValue,
      description,
      main_image,
      additional_images: additional_images || [],
      stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
      sold_quantity: soldQuantityValue,
      branch_id: branch_id ? parseInt(branch_id) : 1,
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

    console.log('📦 [Products API] Final update data:', updateData);
    console.log('📦 [Products API] jersey_prices in updateData:', updateData.jersey_prices);
    
    console.log('📦 [Products API] About to update in Supabase with data:', JSON.stringify(updateData, null, 2));
    
    // Update the product using Supabase
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

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
