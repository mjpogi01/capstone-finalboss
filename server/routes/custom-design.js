const express = require('express');
const multer = require('multer');
const { supabase } = require('../lib/db');
const { uploadToCloudinary } = require('../middleware/upload');
const emailService = require('../lib/emailService');
const router = express.Router();

const branches = [
  { id: 'san-pascual', name: 'SAN PASCUAL (MAIN BRANCH)', address: 'Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas' },
  { id: 'calapan', name: 'CALAPAN BRANCH', address: 'Unit 2, G/F Basa Bldg., Infantado St., San Vicente West, Calapan City' },
  { id: 'muzon', name: 'MUZON BRANCH', address: 'Barangay Muzon, San Luis, 4226 Batangas' },
  { id: 'lemery', name: 'LEMERY BRANCH', address: 'Miranda Bldg, Illustre Ave., Brgy. District III 4209 Lemery Batangas' },
  { id: 'batangas-city', name: 'BATANGAS CITY BRANCH', address: 'Unit 1 Casa Buena Bldg, P. Burgos St. Ext Calicanto, Batangas' },
  { id: 'bauan', name: 'BAUAN BRANCH', address: 'J.P Rizal St. Poblacion, Bauan Batangas' },
  { id: 'calaca', name: 'CALACA BRANCH', address: 'Block D-8 Calaca Public Market, Poblacion 4, Calaca City' },
  { id: 'balayan', name: 'BALAYAN BRANCH', address: 'Balayan, Batangas' },
  { id: 'lipa', name: 'LIPA BRANCH', address: 'Lipa City, Batangas' },
];

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common image formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
  }
});

// Create custom design order
router.post('/', upload.array('designImages', 10), async (req, res) => {
  try {
    console.log('🎨 Custom design order submission received');
    
    // Check if user ID is provided (authentication required)
    const userId = req.body.userId;
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to place a custom design order'
      });
    }
    
    const {
      clientName,
      email,
      phone,
      teamName,
      apparelType,
      members,
      shippingMethod,
      pickupBranchId,
      deliveryAddress,
      orderNotes
    } = req.body;

    // Validate required fields
    if (!clientName || !email || !teamName || !apparelType || !members) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['clientName', 'email', 'teamName', 'apparelType', 'members']
      });
    }

    // Map apparel type to display name and category
    const apparelTypeMap = {
      'basketball_jersey': { name: 'Custom Basketball Jersey', category: 'Basketball Jerseys' },
      'volleyball_jersey': { name: 'Custom Volleyball Jersey', category: 'Volleyball Jerseys' },
      'hoodie': { name: 'Custom Hoodie', category: 'Hoodies' },
      'tshirt': { name: 'Custom T-shirt', category: 'T-shirts' },
      'longsleeves': { name: 'Custom Long Sleeves', category: 'Long Sleeves' },
      'uniforms': { name: 'Custom Uniforms', category: 'Uniforms' }
    };
    
    const apparelInfo = apparelTypeMap[apparelType] || { name: 'Custom Design', category: 'Other' };
    const orderName = apparelInfo.name;
    const orderCategory = apparelInfo.category;

    // Parse delivery address if it's a string
    let parsedDeliveryAddress = null;
    if (deliveryAddress) {
      if (typeof deliveryAddress === 'string') {
        try {
          parsedDeliveryAddress = JSON.parse(deliveryAddress);
        } catch (e) {
          parsedDeliveryAddress = { address: deliveryAddress };
        }
      } else {
        parsedDeliveryAddress = deliveryAddress;
      }
    }

    // Parse members JSON if it's a string
    const membersArray = typeof members === 'string' ? JSON.parse(members) : members;
    
    if (!Array.isArray(membersArray) || membersArray.length === 0) {
      return res.status(400).json({ error: 'At least one team member is required' });
    }

    // Validate each member based on jerseyType and apparelType
    const isUniforms = apparelType === 'uniforms';
    const isHoodie = apparelType === 'hoodie';
    const isLongSleeves = apparelType === 'longsleeves';
    
    for (const member of membersArray) {
      // Basic required fields for all members
      if (!member.number || !member.surname || !member.sizingType) {
        return res.status(400).json({ 
          error: 'All team members must have number, surname, and sizing type' 
        });
      }
      
      // For hoodies and long sleeves, they don't have jersey type - treat as shirt-only
      const effectiveJerseyType = (isHoodie || isLongSleeves) ? 'shirt' : (member.jerseyType || 'full');
      
      // Validate sizes based on effectiveJerseyType
      if (effectiveJerseyType === 'full') {
        // Full set requires both sizes
        if (!member.size || !member.shortsSize) {
          return res.status(400).json({ 
            error: 'Full set orders require both shirt size and shorts size for all members' 
          });
        }
      } else if (effectiveJerseyType === 'shirt') {
        // Shirt only requires shirt size, not shorts size
        // This also applies to hoodies and long sleeves (they only need shirt size)
        if (!member.size) {
          const errorMsg = (isHoodie || isLongSleeves)
            ? `${apparelType === 'hoodie' ? 'Hoodie' : 'Long sleeves'} orders require shirt size for all members`
            : 'Shirt-only orders require shirt size for all members';
          return res.status(400).json({ error: errorMsg });
        }
        // shortsSize is not required for shirt-only orders, hoodies, or long sleeves
      } else if (effectiveJerseyType === 'shorts') {
        // Shorts only requires shorts size, not shirt size
        if (!member.shortsSize) {
          return res.status(400).json({ 
            error: 'Shorts-only orders require shorts size for all members' 
        });
        }
        // size is not required for shorts-only orders
      }
      
      // Note: cutType, knittedOption, and fabricOption are optional fields
      // No validation needed for these as they're optional selections
    }

    // Generate order number with unique identifier for walk-in orders
    const isWalkIn = req.body.isWalkIn === 'true' || req.body.isWalkIn === true;
    const orderNumber = isWalkIn 
      ? `WALKIN-CD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      : `CD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Calculate pricing (you can adjust these based on your pricing structure)
    const basePricePerJersey = 500; // Base price per jersey
    const customDesignFee = 200; // Additional fee for custom design
    const subtotalAmount = (basePricePerJersey + customDesignFee) * membersArray.length;
    const shippingCost = shippingMethod === 'delivery' ? 50 : 0;
    const totalAmount = subtotalAmount + shippingCost;

    // Handle image uploads if provided
    let designImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`🎨 Uploading ${req.files.length} design images to Cloudinary`);
      
      try {
        const uploadPromises = req.files.map((file, index) => {
          console.log(`🎨 Uploading image ${index + 1}/${req.files.length}: ${file.originalname}`);
          return uploadToCloudinary(file, 'yohanns-custom-designs');
        });
        
        const results = await Promise.all(uploadPromises);
        designImages = results.map((result, index) => ({
          filename: req.files[index].originalname,
          url: result.secure_url,
          publicId: result.public_id,
          uploadedAt: new Date().toISOString()
        }));
        
        console.log('🎨 Design images uploaded successfully');
      } catch (uploadError) {
        console.error('❌ Image upload error:', uploadError);
        return res.status(500).json({ 
          error: 'Failed to upload design images',
          details: uploadError.message 
        });
      }
    }

    // Verify the provided user exists (authentication required)
    let finalUserId = userId;
    
    try {
      const { data: existingUser, error: userError } = await supabase.auth.admin.getUserById(finalUserId);
      
      if (userError || !existingUser.user) {
        console.error('❌ User not found:', userError);
        return res.status(401).json({ 
          error: 'Invalid user',
          message: 'The provided user ID is not valid'
        });
      } else {
        console.log('✅ Using authenticated user:', finalUserId);
      }
    } catch (error) {
      console.error('❌ Error verifying user:', error);
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Unable to verify user authentication'
      });
    }

    // Create order data - using existing schema with custom data in JSON fields
    const orderData = {
      user_id: finalUserId,
      order_number: orderNumber,
      status: 'pending',
      order_type: 'custom_design', // Set order type for proper artist assignment
      shipping_method: shippingMethod === 'delivery' ? 'cod' : shippingMethod, // Convert 'delivery' to 'cod'
      pickup_location: pickupBranchId ? branches.find(b => b.id === pickupBranchId)?.name : null, // Store pickup location for both pickup and COD (nearest branch for fulfillment)
      delivery_address: shippingMethod === 'delivery' && parsedDeliveryAddress ? {
        address: parsedDeliveryAddress.address || '',
        receiver: parsedDeliveryAddress.receiver || '',
        phone: parsedDeliveryAddress.phone || '',
        province: parsedDeliveryAddress.province || '',
        city: parsedDeliveryAddress.city || '',
        barangay: parsedDeliveryAddress.barangay || '',
        postalCode: parsedDeliveryAddress.postalCode || parsedDeliveryAddress.postal_code || '',
        streetAddress: parsedDeliveryAddress.streetAddress || parsedDeliveryAddress.street_address || ''
      } : null,
      order_notes: orderNotes,
      subtotal_amount: subtotalAmount,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      total_items: membersArray.length,
      order_items: [{
        product_type: 'custom_design',
        name: orderName, // Use apparel type-based name (e.g., "Custom Basketball Jersey")
        category: orderCategory, // Set category for analytics (e.g., "Basketball Jerseys")
        apparel_type: apparelType, // Store the apparel type
        team_name: teamName,
        team_members: membersArray,
        design_images: designImages,
        client_name: clientName,
        client_email: email,
        client_phone: phone,
        quantity: membersArray.length,
        price: (basePricePerJersey + customDesignFee)
        // Note: pickup_branch_id column doesn't exist in the database, so we only use pickup_location
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert order into database
    console.log('🎨 Inserting custom design order into database');
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (insertError || !insertedOrder) {
      console.error('❌ Database insert error:', insertError);
      return res.status(500).json({ 
        error: 'Failed to create custom design order',
        details: insertError?.message 
      });
    }

    console.log(`✅ Custom design order created: ${orderNumber}`);
    
    // Note: Artist task assignment will happen when admin/owner presses "Start Layout" button
    // This ensures tasks are only assigned when layout work is ready to begin

    // Send confirmation email (non-blocking - don't await)
    // Let it run in background so it doesn't delay order response
    const emailConfigured = Boolean(process.env.EMAIL_USER);
    if (emailConfigured) {
      (async () => {
        try {
          const emailResult = await emailService.sendCustomDesignConfirmation(
            insertedOrder,
            email,
            clientName
          );
          if (emailResult.success) {
            console.log(`📧 Custom design confirmation email sent to ${email}`);
          } else {
            console.warn(`⚠️ Custom design confirmation email failed:`, emailResult.error);
          }
        } catch (emailError) {
          const errorMsg = emailError.message || emailError.code || 'Unknown error';
          console.error(`❌ Failed to send custom design confirmation email:`, errorMsg);
          if (process.env.NODE_ENV === 'development') {
            console.error('Full email error:', emailError);
          }
        }
      })();
    } else {
      console.warn('⚠️ Skipping custom design confirmation email: EMAIL_USER not configured');
    }

    // Respond immediately - don't wait for email
    res.status(201).json({
      success: true,
      message: 'Custom design order created successfully',
      order: insertedOrder,
      emailSent: false, // Actual send result runs in background
      emailQueued: emailConfigured,
      emailError: null
    });

  } catch (error) {
    console.error('❌ Custom design order error:', error);
    res.status(500).json({ 
      error: 'Failed to create custom design order',
      details: error.message 
    });
  }
});

// Get custom design orders (for admin)
router.get('/', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'custom_design')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching custom design orders:', error);
      return res.status(500).json({ error: 'Failed to fetch custom design orders' });
    }

    res.json({ orders });
  } catch (error) {
    console.error('❌ Error in get custom design orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific custom design order
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('order_type', 'custom_design')
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Custom design order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('❌ Error fetching custom design order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;