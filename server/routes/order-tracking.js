const express = require('express');
const { supabase } = require('../lib/db');
const router = express.Router();

async function enrichReviewsWithUserInfo(reviews = []) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return reviews || [];
  }

  const userIds = [...new Set(reviews.map(review => review.user_id).filter(Boolean))];
  const userMap = {};

  for (const userId of userIds) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (!error && data?.user) {
        const user = data.user;
        const firstName = user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || '';
        const lastName = user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || '';
        const metaFullName = user.user_metadata?.full_name || user.raw_user_meta_data?.full_name;
        const fullName = metaFullName || `${firstName} ${lastName}`.trim();
        userMap[userId] = {
          email: user.email || null,
          fullName: fullName && fullName.trim() !== '' ? fullName : null
        };
      }
    } catch (error) {
      console.warn(`Unable to fetch user ${userId} for review display:`, error.message);
    }
  }

  return reviews.map(review => {
    const userInfo = review.user_id ? userMap[review.user_id] : null;
    const normalizedRating = typeof review.rating === 'number'
      ? review.rating
      : Number(review.rating) || 0;

    return {
      ...review,
      rating: normalizedRating,
      review_type: review.review_type || 'general',
      user_email: userInfo?.email || review.user_email || null,
      user_name: userInfo?.fullName || review.user_name || userInfo?.email || review.user_email || null
    };
  });
}

function parseOrderItems(orderItems) {
  if (!orderItems) return [];
  if (Array.isArray(orderItems)) return orderItems;
  if (typeof orderItems === 'string') {
    try {
      const parsed = JSON.parse(orderItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Unable to parse order_items JSON:', error.message);
      return [];
    }
  }
  return [];
}

function orderContainsProduct(orderItems, productId) {
  if (!productId) return false;
  const items = parseOrderItems(orderItems);
  return items.some(item => item?.id === productId || item?.product_id === productId);
}

// Get order tracking history
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const trackingData = await supabase
      .from('order_tracking')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });

    if (trackingData.error) {
      throw trackingData.error;
    }

    res.json(trackingData.data);
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ error: 'Failed to fetch order tracking' });
  }
});

// Order status constants
const ORDER_STATUS = {
  IN_STORE: 'in_store',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered'
};

// Status information mapping
const STATUS_INFO = {
  [ORDER_STATUS.IN_STORE]: {
    location: 'Store Branch',
    description: 'Your order is being prepared at our store branch',
    icon: '🏪',
    color: '#3B82F6'
  },
  [ORDER_STATUS.ON_THE_WAY]: {
    location: 'On The Way',
    description: 'Your order is on the way to your location',
    icon: '🚚',
    color: '#F59E0B'
  },
  [ORDER_STATUS.DELIVERED]: {
    location: 'Delivered',
    description: 'Your order has arrived at your location',
    icon: '✅',
    color: '#10B981'
  }
};

// Add tracking update
router.post('/', async (req, res) => {
  try {
    const { orderId, status, location, description, metadata } = req.body;
    
    // Validate status
    if (!Object.values(ORDER_STATUS).includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: in_store, on_the_way, delivered' 
      });
    }
    
    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, shipping_method')
      .eq('id', orderId);

    if (orderError || order.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get status information
    const statusInfo = STATUS_INFO[status];
    const finalLocation = location || statusInfo.location;
    const finalDescription = description || statusInfo.description;
    
    // Prepare metadata with status info
    const finalMetadata = {
      icon: statusInfo.icon,
      color: statusInfo.color,
      updatedBy: req.user?.id || 'system',
      updateReason: 'Status update',
      ...metadata
    };
    
    const { data: trackingData, error: trackingError } = await supabase
      .from('order_tracking')
      .insert([{
        order_id: orderId,
        status: status,
        location: finalLocation,
        description: finalDescription,
        metadata: JSON.stringify(finalMetadata)
      }])
      .select()
      .single();

    if (trackingError) {
      throw trackingError;
    }

    res.json(trackingData);
  } catch (error) {
    console.error('Error adding tracking update:', error);
    res.status(500).json({ error: 'Failed to add tracking update' });
  }
});

// Get order review (with orderId parameter - must come before catch-all)
router.get('/review/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { data: reviewData, error: reviewError } = await supabase
      .from('order_reviews')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (reviewError || !reviewData) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(reviewData);
  } catch (error) {
    console.error('Error fetching order review:', error);
    res.status(500).json({ error: 'Failed to fetch order review' });
  }
});

// Get order review (catch-all without orderId - must come after parameterized route)
router.get('/review', async (req, res) => {
  res.status(400).json({ 
    error: 'Order ID is required. Use GET /api/order-tracking/review/:orderId instead.',
    hint: 'To submit a review, use POST /api/order-tracking/review'
  });
});

// Add order review (Universal - works for ALL orders)
router.post('/review', async (req, res) => {
  try {
    const { orderId, userId, rating, comment, reviewType = 'general', productId } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if order exists (any order type)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, shipping_method')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Allow reviews for all order types and statuses
    // Only restrict if order is cancelled or refunded
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return res.status(400).json({ 
        error: 'Reviews are not available for cancelled or refunded orders' 
      });
    }
    
    const reviewData = {
      order_id: orderId,
      user_id: userId,
      rating: rating,
      comment: comment
    };
    
    // Only add product_id if it's provided
    if (productId) {
      reviewData.product_id = productId;
    }
    
    const { data: reviewResult, error: reviewError } = await supabase
      .from('order_reviews')
      .upsert(reviewData)
      .select()
      .single();

    if (reviewError) {
      console.error('Supabase review insert error:', reviewError);
      return res.status(500).json({ 
        error: 'Failed to add order review',
        details: reviewError.message,
        code: reviewError.code
      });
    }

    res.json({
      success: true,
      message: 'Review submitted successfully',
      review: reviewResult
    });
  } catch (error) {
    console.error('Error adding order review:', error);
    res.status(500).json({ 
      error: 'Failed to add order review',
      details: error.message 
    });
  }
});

// Get delivery proof
router.get('/delivery-proof/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { data: proofData, error: proofError } = await supabase
      .from('delivery_proof')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (proofError || !proofData) {
      return res.status(404).json({ error: 'Delivery proof not found' });
    }

    res.json(proofData);
  } catch (error) {
    console.error('Error fetching delivery proof:', error);
    res.status(500).json({ error: 'Failed to fetch delivery proof' });
  }
});

// Add delivery proof
router.post('/delivery-proof', async (req, res) => {
  try {
    const { 
      orderId, 
      deliveryPersonName, 
      deliveryPersonContact, 
      proofImages, 
      deliveryNotes 
    } = req.body;
    
    // Check if order is COD before allowing delivery proof
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('shipping_method')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.shipping_method !== 'cod') {
      return res.status(400).json({ 
        error: 'Delivery proof is only available for Cash on Delivery (COD) orders' 
      });
    }
    
    const { data: proofData, error: proofError } = await supabase
      .from('delivery_proof')
      .insert([{
        order_id: orderId,
        delivery_person_name: deliveryPersonName,
        delivery_person_contact: deliveryPersonContact,
        proof_images: proofImages,
        delivery_notes: deliveryNotes
      }])
      .select()
      .single();

    if (proofError) {
      throw proofError;
    }

    res.json(proofData);
  } catch (error) {
    console.error('Error adding delivery proof:', error);
    res.status(500).json({ error: 'Failed to add delivery proof' });
  }
});

// Verify delivery proof (admin function)
router.put('/delivery-proof/:proofId/verify', async (req, res) => {
  try {
    const { proofId } = req.params;
    const { verifiedBy } = req.body;
    
    const { data: updatedProof, error: updateError } = await supabase
      .from('delivery_proof')
      .update({ verified_by: verifiedBy, verified_at: supabase.rpc('now') })
      .eq('id', proofId)
      .select()
      .single();

    if (updateError || !updatedProof) {
      return res.status(404).json({ error: 'Delivery proof not found' });
    }

    res.json(updatedProof);
  } catch (error) {
    console.error('Error verifying delivery proof:', error);
    res.status(500).json({ error: 'Failed to verify delivery proof' });
  }
});

// Update order status (simplified endpoint for 3-status system)
router.put('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!Object.values(ORDER_STATUS).includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: in_store, on_the_way, delivered' 
      });
    }
    
    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get status information
    const statusInfo = STATUS_INFO[status];
    
    // Prepare metadata
    const metadata = {
      icon: statusInfo.icon,
      color: statusInfo.color,
      updatedBy: req.user?.id || 'admin',
      updateReason: 'Status update by administrator',
      timestamp: supabase.rpc('now')
    };
    
    const { data: trackingData, error: trackingError } = await supabase
      .from('order_tracking')
      .insert([{
        order_id: orderId,
        status: status,
        location: statusInfo.location,
        description: statusInfo.description,
        metadata: JSON.stringify(metadata)
      }])
      .select()
      .single();

    if (trackingError) {
      throw trackingError;
    }

    res.json({
      success: true,
      message: `Order status updated to ${statusInfo.location}`,
      tracking: trackingData
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get current order status
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { data: result, error: resultError } = await supabase
      .from('order_tracking')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (resultError || result.length === 0) {
      return res.status(404).json({ error: 'No tracking information found for this order' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching current order status:', error);
    res.status(500).json({ error: 'Failed to fetch current order status' });
  }
});

// Get all reviews for an order (Universal)
router.get('/reviews/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data: reviews, error: reviewsError } = await supabase
      .from('order_reviews')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      throw reviewsError;
    }

    const enriched = await enrichReviewsWithUserInfo(reviews || []);

    res.json({
      success: true,
      reviews: enriched,
      total: enriched.length
    });
  } catch (error) {
    console.error('Error fetching order reviews:', error);
    res.status(500).json({ error: 'Failed to fetch order reviews' });
  }
});

// Get all reviews by a user (Universal)
router.get('/user-reviews/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: result, error: resultError } = await supabase
      .from('order_reviews')
      .select(`
        r.*,
        o.order_number,
        o.total_amount,
        o.status as order_status
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (resultError) {
      throw resultError;
    }

    res.json({
      success: true,
      reviews: result,
      total: result.length
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

// Get reviews associated with a product (direct product reviews + related order reviews)
router.get('/product-reviews/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Reviews explicitly tied to this product
    const { data: productReviews, error: productError } = await supabase
      .from('order_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (productError) {
      console.warn('Unable to fetch product-specific reviews:', productError.message);
    }

    // Order-level reviews (no product_id) that might include this product
    const { data: generalReviews, error: generalError } = await supabase
      .from('order_reviews')
      .select('*')
      .is('product_id', null)
      .order('created_at', { ascending: false });

    if (generalError) {
      console.warn('Unable to fetch general order reviews:', generalError.message);
    }

    let relevantOrderReviews = [];
    if (generalReviews && generalReviews.length > 0) {
      const orderIds = [...new Set(generalReviews.map(review => review.order_id).filter(Boolean))];
      if (orderIds.length > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_items')
          .in('id', orderIds);

        if (ordersError) {
          console.warn('Unable to fetch orders for review mapping:', ordersError.message);
        } else if (ordersData) {
          const matchingOrderIds = new Set();
          ordersData.forEach(order => {
            if (orderContainsProduct(order.order_items, productId)) {
              matchingOrderIds.add(order.id);
            }
          });

          relevantOrderReviews = generalReviews.filter(review => matchingOrderIds.has(review.order_id));
        }
      }
    }

    const combinedMap = new Map();
    (productReviews || []).forEach(review => combinedMap.set(review.id, review));
    relevantOrderReviews.forEach(review => {
      if (!combinedMap.has(review.id)) {
        combinedMap.set(review.id, review);
      }
    });

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const enriched = await enrichReviewsWithUserInfo(combined);

    res.json({
      success: true,
      reviews: enriched,
      total: enriched.length
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ error: 'Failed to fetch product reviews' });
  }
});

// Get review statistics for an order
router.get('/review-stats/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { data: stats, error: statsError } = await supabase
      .from('order_reviews')
      .select(`
        count(*) as total_reviews,
        avg(rating) as average_rating,
        count(case when rating = 5 then 1 end) as five_star,
        count(case when rating = 4 then 1 end) as four_star,
        count(case when rating = 3 then 1 end) as three_star,
        count(case when rating = 2 then 1 end) as two_star,
        count(case when rating = 1 then 1 end) as one_star
      `)
      .eq('order_id', orderId)
      .single();

    if (statsError) {
      throw statsError;
    }

    const statsData = stats;
    
    res.json({
      success: true,
      statistics: {
        totalReviews: parseInt(statsData.total_reviews),
        averageRating: parseFloat(statsData.average_rating || 0).toFixed(1),
        ratingDistribution: {
          fiveStar: parseInt(statsData.five_star),
          fourStar: parseInt(statsData.four_star),
          threeStar: parseInt(statsData.three_star),
          twoStar: parseInt(statsData.two_star),
          oneStar: parseInt(statsData.one_star)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching review statistics:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

// Update database schema to support review types
router.post('/migrate-reviews', async (req, res) => {
  try {
    // Add review_type column if it doesn't exist
    await supabase.rpc('add_review_type_column');

    // Add index for better performance
    await supabase.rpc('create_review_type_index');

    res.json({
      success: true,
      message: 'Review system migrated successfully'
    });
  } catch (error) {
    console.error('Error migrating review system:', error);
    res.status(500).json({ error: 'Failed to migrate review system' });
  }
});

module.exports = router;
