const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const emailService = require('../lib/emailService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();

// Initialize Supabase admin client for password reset
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// Test endpoint to verify route is working
router.get('/reset-password/test', (req, res) => {
  console.log('✅ Password reset test endpoint reached');
  res.json({ 
    success: true, 
    message: 'Password reset endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// Password reset endpoint with custom email template
router.post('/reset-password', async (req, res) => {
  console.log('🔔 Password reset endpoint called');
  console.log('📥 Request body:', req.body);
  console.log('📥 Request headers:', req.headers);
  
  try {
    const { email } = req.body;
    console.log('📧 Email received:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email address is required' 
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email service is configured
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.warn('⚠️ Email service not configured for password reset');
      // Fall back to Supabase's default email
      const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password`
      });

      if (error) {
        return res.status(400).json({ 
          success: false,
          error: error.message || 'Failed to send password reset email' 
        });
      }

      return res.json({ 
        success: true,
        message: 'Password reset email sent (using default template)'
      });
    }

    // Generate password reset link using Supabase Admin API
    // This generates the token without sending Supabase's default email
    let baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    baseUrl = baseUrl.replace(/\/$/, '');
    const redirectTo = `${baseUrl}/auth/reset-password`;

    // Get user by email using listUsers (getUserByEmail may not be available)
    let user = null;
    let userName = null;
    try {
      // Try getUserByEmail first if available
      let userData = null;
      let getUserError = null;
      
      if (supabase.auth.admin.getUserByEmail) {
        const result = await supabase.auth.admin.getUserByEmail(normalizedEmail);
        userData = result.data;
        getUserError = result.error;
      }
      
      // If getUserByEmail doesn't exist or failed, fall back to listUsers
      if (getUserError || !userData || !userData.user) {
        // Fallback: use listUsers to find user by email
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && usersData && usersData.users) {
          const foundUser = usersData.users.find(
            u => u.email && u.email.toLowerCase() === normalizedEmail
          );
          
          if (foundUser) {
            user = foundUser;
            userName = foundUser.user_metadata?.full_name || 
                      foundUser.user_metadata?.name ||
                      foundUser.email?.split('@')[0] || null;
          }
        }
      } else {
        // getUserByEmail worked
        user = userData.user;
        userName = userData.user.user_metadata?.full_name || 
                   userData.user.user_metadata?.name ||
                   userData.user.email?.split('@')[0] || null;
      }
      
      // If user still not found, return success anyway (security best practice)
      if (!user) {
        return res.json({ 
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.'
        });
      }

      // Check if user signed up with OAuth (Google, etc.) - they don't have passwords
      const isOAuthUser = user.identities && user.identities.some(
        identity => identity.provider !== 'email'
      );
      
      if (isOAuthUser) {
        const providers = user.identities
          .filter(id => id.provider !== 'email')
          .map(id => id.provider.charAt(0).toUpperCase() + id.provider.slice(1))
          .join(' or ');
        
        console.log(`⚠️ OAuth user detected (${providers}) - cannot reset password`);
        return res.status(400).json({
          success: false,
          error: `This account was created using ${providers} sign-in. Please sign in with ${providers} instead. Password reset is not available for OAuth accounts.`,
          code: 'OAUTH_USER'
        });
      }
    } catch (userError) {
      // Error fetching user - return success anyway (security best practice)
      console.warn('Could not fetch user info for password reset:', userError.message);
      return res.json({ 
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Check if email service is configured before proceeding
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.warn('⚠️ Email service not configured - cannot send custom password reset email');
      console.warn('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'NOT SET');
      console.warn('   RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL ? 'Set' : 'NOT SET');
      // Fallback to Supabase's default email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectTo
      });
      
      if (resetError) {
        console.error('❌ Supabase password reset also failed:', resetError.message);
      } else {
        console.log('✅ Supabase password reset email sent (fallback)');
      }
      
      return res.json({ 
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate recovery token using Admin API (this doesn't send email)
    // We'll use generateLink to create the reset link with token
    try {
      console.log(`🔗 Generating recovery link for: ${normalizedEmail}`);
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo: redirectTo
        }
      });

      if (linkError) {
        console.error('❌ Failed to generate recovery link:', linkError);
        console.error('   Error details:', JSON.stringify(linkError, null, 2));
        // Fallback: use resetPasswordForEmail but note that it will send Supabase's email
        console.warn('⚠️ Falling back to resetPasswordForEmail (will send Supabase email)');
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: redirectTo
        });
        
        if (resetError) {
          console.error('❌ Fallback resetPasswordForEmail also failed:', resetError.message);
          // Still return success for security
          return res.json({ 
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
          });
        } else {
          console.log('✅ Supabase password reset email sent (fallback)');
        }
      } else if (!linkData || !linkData.properties || !linkData.properties.action_link) {
        console.error('❌ Invalid recovery link data:', linkData);
        // Fallback: use resetPasswordForEmail
        console.warn('⚠️ Falling back to resetPasswordForEmail (will send Supabase email)');
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: redirectTo
        });
        
        if (resetError) {
          console.error('❌ Fallback resetPasswordForEmail also failed:', resetError.message);
        } else {
          console.log('✅ Supabase password reset email sent (fallback)');
        }
      } else {
        // We have the recovery link with token - send only our custom email
        const resetLink = linkData.properties.action_link;
        console.log(`✅ Recovery link generated: ${resetLink.substring(0, 50)}...`);
        
        // Send our custom styled email template with the actual reset link
        console.log(`📧 Attempting to send password reset email to: ${normalizedEmail}`);
        const emailResult = await emailService.sendPasswordResetEmail(
          normalizedEmail,
          resetLink, // Full link with token
          userName
        );

        if (emailResult.success) {
          console.log(`✅ Custom password reset email sent successfully to: ${normalizedEmail}`);
          console.log(`📧 Email Details:`);
          console.log(`   - Recipient: ${normalizedEmail}`);
          console.log(`   - Subject: Reset Your Password - Yohanns`);
          console.log(`   - Message ID: ${emailResult.messageId}`);
          console.log(`   - Timestamp: ${new Date().toISOString()}`);
          console.log(`   - Reset link generated (Supabase email disabled)`);
        } else {
          console.error('❌ Failed to send custom password reset email:', emailResult.error);
          console.error('   Email service error details:', JSON.stringify(emailResult, null, 2));
          // Try fallback to Supabase email
          console.warn('⚠️ Attempting fallback to Supabase email...');
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: redirectTo
          });
          if (resetError) {
            console.error('❌ Supabase fallback also failed:', resetError.message);
          } else {
            console.log('✅ Supabase password reset email sent (fallback)');
          }
        }
      }
    } catch (tokenError) {
      console.error('❌ Exception generating recovery token:', tokenError);
      console.error('   Stack:', tokenError.stack);
      // Fallback: use resetPasswordForEmail
      console.warn('⚠️ Falling back to resetPasswordForEmail (will send Supabase email)');
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: redirectTo
        });
        if (resetError) {
          console.error('❌ Supabase fallback also failed:', resetError.message);
        } else {
          console.log('✅ Supabase password reset email sent (fallback)');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback exception:', fallbackError);
      }
    }
    
    // Always return success (security best practice - don't reveal if user exists)
    return res.json({ 
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('❌ Error in password reset endpoint:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

module.exports = router;