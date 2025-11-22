const express = require('express');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');

const router = express.Router();

// General upload endpoint for authenticated users (artists, customers, etc.)
router.post('/', authenticateSupabaseToken, upload.single('file'), async (req, res) => {
  try {
    console.log('General upload request received:', {
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file',
      user: req.user
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to Cloudinary with general folder
    const result = await uploadToCloudinary(req.file, 'yohanns-uploads');
    
    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('General upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

// Upload profile image (allows all authenticated users)
router.post('/profile', authenticateSupabaseToken, upload.single('image'), async (req, res) => {
  try {
    console.log('Profile image upload request received:', {
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file',
      user: req.user
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload to Cloudinary with profile-specific folder
    const result = await uploadToCloudinary(req.file, 'yohanns-profiles');
    
    res.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload profile image',
      details: error.message 
    });
  }
});

// Upload single image
router.post('/single', authenticateSupabaseToken, requireAdminOrOwner, upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received:', {
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file',
      user: req.user
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await uploadToCloudinary(req.file);
    
    res.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// Upload multiple images
router.post('/multiple', authenticateSupabaseToken, requireAdminOrOwner, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploadPromises = req.files.map(file => uploadToCloudinary(file));
    const results = await Promise.all(uploadPromises);
    
    const imageUrls = results.map(result => result.secure_url);
    const publicIds = results.map(result => result.public_id);

    res.json({
      success: true,
      imageUrls,
      publicIds
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Delete image from Cloudinary
router.delete('/:publicId', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {
    const { publicId } = req.params;
    const cloudinary = require('../lib/cloudinary');
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({ success: true, message: 'Image deleted successfully' });
    } else {
      res.status(400).json({ error: 'Failed to delete image' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
