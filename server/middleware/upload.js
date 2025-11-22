const multer = require('multer');
const cloudinary = require('../lib/cloudinary');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type - allow images and design files
    const allowedTypes = [
      'image/', 'application/pdf', 'application/postscript', 
      'application/illustrator', 'application/x-illustrator',
      'image/vnd.adobe.photoshop', 'application/x-photoshop'
    ];
    
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type)) ||
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/postscript' ||
                     file.mimetype === 'application/illustrator' ||
                     file.mimetype === 'application/x-illustrator' ||
                     file.mimetype === 'image/vnd.adobe.photoshop' ||
                     file.mimetype === 'application/x-photoshop';
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only image files, PDF, AI, and PSD files are allowed!'), false);
    }
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file, folder = 'yohanns-products') => {
  return new Promise((resolve, reject) => {
    console.log('Uploading to Cloudinary:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload success:', result.secure_url);
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

module.exports = { upload, uploadToCloudinary };
