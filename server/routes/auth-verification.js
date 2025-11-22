const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const emailService = require('../lib/emailService');
const { validateEmail } = require('../lib/emailValidator');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase admin client for email confirmation
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const router = express.Router();

// In-memory store for verification codes
// Format: { email: { code: '123456', expiresAt: timestamp, userId: 'user-id', userData: {...} } }
const verificationCodes = new Map();

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) {
      verificationCodes.delete(email);
      console.log(`🧹 Cleaned up expired verification code for ${email}`);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

// Generate 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate email endpoint
router.post('/validate-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        valid: false,
        errors: ['Email address is required'] 
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in Supabase Auth
    try {
      // Try to get user by email (more efficient than listing all users)
      const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(normalizedEmail);
      
      if (!getUserError && existingUser && existingUser.user) {
        return res.json({
          valid: false,
          errors: ['This email address is already registered'],
          code: 'EMAIL_EXISTS'
        });
      }

      // If getUserByEmail doesn't exist, fall back to listUsers
      if (getUserError && getUserError.message?.includes('not found')) {
        // User doesn't exist, continue validation
      } else if (getUserError) {
        // Other error - try listUsers as fallback
        console.warn('⚠️ getUserByEmail failed, trying listUsers:', getUserError.message);
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && existingUsers && existingUsers.users) {
          const emailExists = existingUsers.users.some(
            user => user.email && user.email.toLowerCase() === normalizedEmail
          );

          if (emailExists) {
            return res.json({
              valid: false,
              errors: ['This email address is already registered'],
              code: 'EMAIL_EXISTS'
            });
          }
        }
      }
    } catch (checkError) {
      console.warn('⚠️ Could not check existing emails:', checkError.message);
      // Continue with validation even if check fails
    }

    // Comprehensive email validation with SMTP verification
    // For /validate-email endpoint (used during signup), be STRICT
    const validationResult = await validateEmail(normalizedEmail, {
      checkDomain: true,
      verifyEmail: true, // Enable SMTP verification to check if email actually exists
      allowDisposable: false
    });

    if (!validationResult.valid) {
      return res.status(400).json(validationResult);
    }

    // Email passed validation - return success
    // Warnings are included but don't block signup (for major providers)
    res.json({
      valid: true,
      errors: [],
      warnings: validationResult.warnings || []
    });

  } catch (error) {
    console.error('Error validating email:', error);
    res.status(500).json({ 
      valid: false,
      errors: ['Internal server error during email validation'] 
    });
  }
});

// Send verification code to email
router.post('/send-code', async (req, res) => {
  try {
    const { email, userName, userId, userData } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Normalize email to lowercase for consistent storage
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email before sending code
    console.log(`🔍 Validating email before sending code: ${normalizedEmail}`);
    
    // Check if email already exists
    try {
      // Try to get user by email (more efficient than listing all users)
      const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(normalizedEmail);
      
      if (!getUserError && existingUser && existingUser.user) {
        console.log(`❌ Email already exists: ${normalizedEmail}`);
        return res.status(400).json({
          success: false,
          error: 'This email address is already registered. Please sign in instead.',
          code: 'EMAIL_EXISTS'
        });
      }

      // If getUserByEmail doesn't exist, fall back to listUsers
      if (getUserError && getUserError.message?.includes('not found')) {
        // User doesn't exist, continue validation
      } else if (getUserError) {
        // Other error - try listUsers as fallback
        console.warn('⚠️ getUserByEmail failed, trying listUsers:', getUserError.message);
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && existingUsers && existingUsers.users) {
          const emailExists = existingUsers.users.some(
            user => user.email && user.email.toLowerCase() === normalizedEmail
          );

          if (emailExists) {
            console.log(`❌ Email already exists: ${normalizedEmail}`);
            return res.status(400).json({
              success: false,
              error: 'This email address is already registered. Please sign in instead.',
              code: 'EMAIL_EXISTS'
            });
          }
        }
      }
    } catch (checkError) {
      console.warn('⚠️ Could not check existing emails:', checkError.message);
      // Continue with validation even if check fails
    }

    // Comprehensive email validation with SMTP verification
    const validationResult = await validateEmail(normalizedEmail, {
      checkDomain: true,
      verifyEmail: true, // Enable SMTP verification to check if email actually exists
      allowDisposable: false
    });

    if (!validationResult.valid) {
      console.log(`❌ Email validation failed for ${normalizedEmail}:`, validationResult.errors);
      return res.status(400).json({
        success: false,
        error: validationResult.errors.join('. '),
        code: 'INVALID_EMAIL'
      });
    }

    if (validationResult.warnings && validationResult.warnings.length > 0) {
      console.log(`⚠️ Email validation warnings for ${normalizedEmail}:`, validationResult.warnings);
    }

    // Check if email service is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email service not configured - verification codes will not be sent');
      // Return success anyway (for development/testing)
      return res.json({
        success: true,
        message: 'Verification code would be sent to your email (email service not configured)',
        expiresIn: 10,
        warning: 'Email service not configured'
      });
    }

    // Check if a code was recently sent (prevent duplicate sends within 30 seconds)
    const existingData = verificationCodes.get(normalizedEmail);
    if (existingData && existingData.lastSentAt) {
      const timeSinceLastSend = Date.now() - existingData.lastSentAt;
      const minTimeBetweenSends = 30 * 1000; // 30 seconds
      
      if (timeSinceLastSend < minTimeBetweenSends) {
        const secondsLeft = Math.ceil((minTimeBetweenSends - timeSinceLastSend) / 1000);
        console.log(`⏱️ Code already sent recently for ${normalizedEmail}, wait ${secondsLeft} seconds`);
        // Return existing code info but don't send another email
        const expiresIn = existingData.expiresAt > Date.now() 
          ? Math.floor((existingData.expiresAt - Date.now()) / 60000)
          : 0;
        return res.json({
          success: true,
          message: `Verification code already sent. Please check your email. Wait ${secondsLeft} second(s) before requesting a new code.`,
          expiresIn: expiresIn,
          retryAfter: secondsLeft
        });
      }
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store verification code (preserve existing user data if present, or use new data)
    verificationCodes.set(normalizedEmail, {
      code,
      expiresAt,
      userId: userId || existingData?.userId || null,
      userData: userData || existingData?.userData || null,
      attempts: existingData?.attempts || 0, // Preserve attempt count
      maxAttempts: 5,
      lastSentAt: Date.now() // Track when code was sent
    });

    console.log(`📧 Generated verification code for ${normalizedEmail}: ${code}`);
    console.log(`📋 Stored code: "${code}" (length: ${code.length})`);

    // Send email with verification code (use original email for display, normalized for storage)
    const emailResult = await emailService.sendVerificationCode(normalizedEmail, code, userName);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Verification code sent to your email',
        expiresIn: 10 // minutes
      });
    } else {
      // Don't remove code if email failed - allow retry
      console.warn('⚠️ Email send failed but code is stored:', emailResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to send verification email',
        details: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Email and verification code are required' 
      });
    }

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    // Normalize code - remove whitespace, only digits
    const normalizedCode = code.toString().trim().replace(/\D/g, '');

    console.log(`🔍 Verifying code for ${normalizedEmail}`);
    console.log(`📝 Received code: "${code}" (normalized: "${normalizedCode}")`);

    let storedData = verificationCodes.get(normalizedEmail);

    if (!storedData) {
      // Try case-insensitive search as fallback
      let foundEmail = null;
      for (const [storedEmail] of verificationCodes.entries()) {
        if (storedEmail.toLowerCase() === normalizedEmail) {
          foundEmail = storedEmail;
          break;
        }
      }

      if (foundEmail) {
        // Move to normalized email
        const data = verificationCodes.get(foundEmail);
        verificationCodes.delete(foundEmail);
        verificationCodes.set(normalizedEmail, data);
        storedData = data;
        console.log(`🔄 Found code under different case: ${foundEmail} -> ${normalizedEmail}`);
      } else {
        console.log(`❌ No verification code found for ${normalizedEmail}`);
        console.log(`📋 Available emails:`, Array.from(verificationCodes.keys()));
        return res.status(404).json({ 
          error: 'Verification code not found. Please request a new code.',
          code: 'CODE_NOT_FOUND'
        });
      }
    }

    // Check if code has expired
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(normalizedEmail);
      console.log(`⏰ Code expired for ${normalizedEmail}`);
      return res.status(400).json({ 
        error: 'Verification code has expired. Please request a new code.',
        code: 'CODE_EXPIRED'
      });
    }

    // Check max attempts
    if (storedData.attempts >= storedData.maxAttempts) {
      verificationCodes.delete(normalizedEmail);
      console.log(`❌ Max attempts exceeded for ${normalizedEmail}`);
      return res.status(400).json({ 
        error: 'Maximum verification attempts exceeded. Please request a new code.',
        code: 'MAX_ATTEMPTS_EXCEEDED'
      });
    }

    // Increment attempts
    storedData.attempts++;

    console.log(`🔐 Stored code: "${storedData.code}"`);
    console.log(`📥 Received code: "${normalizedCode}"`);
    console.log(`✅ Match: ${storedData.code === normalizedCode}`);

    // Verify code (strict comparison after normalization)
    if (storedData.code !== normalizedCode) {
      const remainingAttempts = storedData.maxAttempts - storedData.attempts;
      console.log(`❌ Code mismatch for ${normalizedEmail}. Attempt ${storedData.attempts}/${storedData.maxAttempts}`);
      return res.status(400).json({ 
        error: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new code.'}`,
        code: 'INVALID_CODE',
        remainingAttempts
      });
    }

    // Code is valid - confirm email in Supabase Auth and return success
    const userData = storedData.userData;
    const userId = storedData.userId;
    verificationCodes.delete(normalizedEmail);

    console.log(`✅ Verification code verified for ${normalizedEmail}`);

    // Confirm email in Supabase Auth if userId is available
    if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true
        });

        if (confirmError) {
          console.warn('⚠️ Could not confirm email in Supabase:', confirmError.message);
          // Don't fail verification if confirmation fails
        } else {
          console.log(`✅ Email confirmed in Supabase Auth for ${email}`);
        }
      } catch (confirmException) {
        console.warn('⚠️ Exception confirming email in Supabase:', confirmException.message);
        // Don't fail verification if confirmation fails
      }
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
      userId: userId,
      userData: userData
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Normalize email to lowercase for consistent storage
    const normalizedEmail = email.toLowerCase().trim();

    // Check if there's existing data to preserve (try case-insensitive search)
    let existingData = verificationCodes.get(normalizedEmail);
    
    if (!existingData) {
      // Try case-insensitive search as fallback
      for (const [storedEmail, data] of verificationCodes.entries()) {
        if (storedEmail.toLowerCase() === normalizedEmail) {
          existingData = data;
          // Move to normalized email
          verificationCodes.delete(storedEmail);
          break;
        }
      }
    }

           // Check rate limit for resend (prevent spam)
           if (existingData && existingData.lastSentAt) {
             const timeSinceLastSend = Date.now() - existingData.lastSentAt;
             const minTimeBetweenResends = 30 * 1000; // 30 seconds
             
             if (timeSinceLastSend < minTimeBetweenResends) {
               const secondsLeft = Math.ceil((minTimeBetweenResends - timeSinceLastSend) / 1000);
               return res.status(429).json({
                 success: false,
                 error: `Please wait ${secondsLeft} second(s) before requesting a new code.`,
                 retryAfter: secondsLeft
               });
             }
           }

           // Generate new code
           const code = generateVerificationCode();
           const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

           // Store new verification code (preserve user data if exists)
           verificationCodes.set(normalizedEmail, {
             code,
             expiresAt,
             userId: existingData?.userId || null,
             userData: existingData?.userData || null,
             attempts: 0, // Reset attempts
             maxAttempts: 5,
             lastSentAt: Date.now() // Track when code was sent
           });

    console.log(`📧 Resent verification code for ${normalizedEmail}: ${code}`);
    console.log(`📋 Stored code: "${code}" (length: ${code.length})`);

    // Send email with new verification code (use original email for display, normalized for storage)
    const emailResult = await emailService.sendVerificationCode(normalizedEmail, code, userName);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Verification code resent to your email',
        expiresIn: 10 // minutes
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send verification email',
        details: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
