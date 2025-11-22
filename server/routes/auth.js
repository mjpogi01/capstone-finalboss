const express = require('express');
const axios = require('axios');

const router = express.Router();

// Note: Authentication is now handled entirely by Supabase Auth
// These routes are kept for backward compatibility but should not be used
// Frontend should use Supabase Auth directly

// Test endpoint to check reCAPTCHA configuration
router.get('/verify-recaptcha/test', (req, res) => {
  const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
  res.json({
    configured: !!RECAPTCHA_SECRET_KEY,
    hasSecretKey: RECAPTCHA_SECRET_KEY ? 'Yes (hidden)' : 'No',
    message: RECAPTCHA_SECRET_KEY 
      ? '✅ reCAPTCHA secret key is configured' 
      : '⚠️ RECAPTCHA_SECRET_KEY is not set in environment variables'
  });
});

// reCAPTCHA verification endpoint
router.post('/verify-recaptcha', async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔍 reCAPTCHA verification request received');

    if (!token) {
      console.warn('⚠️ reCAPTCHA verification failed: No token provided');
      return res.status(400).json({ 
        success: false,
        error: 'reCAPTCHA token is required' 
      });
    }

    // Get reCAPTCHA secret key from environment variables
    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!RECAPTCHA_SECRET_KEY) {
      console.error('⚠️ RECAPTCHA_SECRET_KEY is not set in environment variables');
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error: reCAPTCHA secret key not configured' 
      });
    }

    console.log('✅ RECAPTCHA_SECRET_KEY is configured, verifying with Google...');

    // Verify the token with Google's reCAPTCHA API
    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    
    try {
      const response = await axios.post(verificationUrl, null, {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token
        },
        timeout: 10000 // 10 second timeout
      });

      const { success, challenge_ts, hostname, 'error-codes': errorCodes } = response.data;

      if (success) {
        // Token is valid
        console.log('✅ reCAPTCHA verification successful:', {
          hostname,
          challenge_ts
        });
        return res.json({ 
          success: true,
          challenge_ts,
          hostname
        });
      } else {
        // Token verification failed
        console.warn('❌ reCAPTCHA verification failed:', errorCodes);
        return res.status(400).json({ 
          success: false,
          error: 'reCAPTCHA verification failed',
          errorCodes
        });
      }
    } catch (verifyError) {
      console.error('❌ Error verifying reCAPTCHA with Google:', verifyError.message);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to verify reCAPTCHA with Google. Please try again.' 
      });
    }
  } catch (error) {
    console.error('❌ Error in reCAPTCHA verification endpoint:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error during reCAPTCHA verification' 
    });
  }
});

router.post('/signup', async (req, res) => {
  return res.status(410).json({ 
    error: 'This endpoint is deprecated. Please use Supabase Auth directly from the frontend.' 
  });
});

router.post('/login', async (req, res) => {
  return res.status(410).json({ 
    error: 'This endpoint is deprecated. Please use Supabase Auth directly from the frontend.' 
  });
});

module.exports = router;