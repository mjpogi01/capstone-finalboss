const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const emailService = require('../lib/emailService');
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client with admin access
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

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email address is required' 
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email address format' 
      });
    }

    console.log('📧 Newsletter subscription request:', normalizedEmail);

    // Check if email already exists
    const { data: existingSub, error: checkError } = await supabase
      .from('newsletter_subscriptions')
      .select('id, email, is_active')
      .eq('email', normalizedEmail)
      .single();

    if (existingSub) {
      if (existingSub.is_active) {
        // Already subscribed and active
        console.log('ℹ️ Email already subscribed:', normalizedEmail);
        return res.json({
          success: true,
          message: 'You are already subscribed to our newsletter!',
          alreadySubscribed: true
        });
      } else {
        // Re-subscribe (was unsubscribed before)
        console.log('🔄 Re-subscribing email:', normalizedEmail);
        const { error: updateError } = await supabase
          .from('newsletter_subscriptions')
          .update({
            is_active: true,
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
            user_id: userId || null
          })
          .eq('email', normalizedEmail);

        if (updateError) {
          console.error('❌ Error re-subscribing:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Failed to subscribe. Please try again.'
          });
        }

        // Send welcome email
        try {
          await emailService.sendNewsletterWelcomeEmail(normalizedEmail);
        } catch (emailError) {
          console.warn('⚠️ Failed to send welcome email (non-critical):', emailError.message);
        }

        return res.json({
          success: true,
          message: 'Welcome back! You have been re-subscribed to our newsletter.'
        });
      }
    }

    // Create new subscription
    const { data: newSub, error: insertError } = await supabase
      .from('newsletter_subscriptions')
      .insert({
        email: normalizedEmail,
        user_id: userId || null,
        is_active: true,
        source: 'website'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating subscription:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to subscribe. Please try again.'
      });
    }

    console.log('✅ Newsletter subscription created:', normalizedEmail);

    // Send welcome email
    try {
      await emailService.sendNewsletterWelcomeEmail(normalizedEmail);
      console.log('✅ Welcome email sent to:', normalizedEmail);
    } catch (emailError) {
      console.warn('⚠️ Failed to send welcome email (non-critical):', emailError.message);
      // Don't fail the subscription if email fails
    }

    res.json({
      success: true,
      message: 'Successfully subscribed to our newsletter! Check your email for a welcome message.',
      subscription: {
        email: normalizedEmail,
        subscribed_at: newSub.subscribed_at
      }
    });

  } catch (error) {
    console.error('❌ Error in newsletter subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
});

// Unsubscribe from newsletter (POST - for API calls)
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email address is required' 
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    console.log('📧 Newsletter unsubscribe request:', normalizedEmail);

    // Update subscription to inactive
    const { data: updatedSub, error: updateError } = await supabase
      .from('newsletter_subscriptions')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('email', normalizedEmail)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error unsubscribing:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe. Please try again.'
      });
    }

    if (!updatedSub) {
      return res.json({
        success: true,
        message: 'Email not found in our subscription list.'
      });
    }

    console.log('✅ Newsletter unsubscribe successful:', normalizedEmail);

    res.json({
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter.'
    });

  } catch (error) {
    console.error('❌ Error in newsletter unsubscribe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
});

// Unsubscribe from newsletter (GET - for email link clicks)
router.get('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email address is required' 
      });
    }

    // Decode and normalize email to lowercase
    const decodedEmail = decodeURIComponent(email);
    const normalizedEmail = decodedEmail.toLowerCase().trim();

    console.log('📧 Newsletter unsubscribe request (GET):', normalizedEmail);

    // Update subscription to inactive
    const { data: updatedSub, error: updateError } = await supabase
      .from('newsletter_subscriptions')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('email', normalizedEmail)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error unsubscribing:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe. Please try again.'
      });
    }

    if (!updatedSub) {
      console.log('ℹ️ Email not found in subscription list:', normalizedEmail);
      return res.json({
        success: true,
        message: 'Email not found in our subscription list.',
        alreadyUnsubscribed: true
      });
    }

    console.log('✅ Newsletter unsubscribe successful:', normalizedEmail);

    res.json({
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter.',
      email: normalizedEmail
    });

  } catch (error) {
    console.error('❌ Error in newsletter unsubscribe (GET):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
});

// Get all active subscribers (admin only)
router.get('/subscribers', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {

    const { data: subscribers, error } = await supabase
      .from('newsletter_subscriptions')
      .select('id, email, subscribed_at, is_active, user_id')
      .eq('is_active', true)
      .order('subscribed_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching subscribers:', error);
      return res.status(500).json({ error: 'Failed to fetch subscribers' });
    }

    res.json({
      success: true,
      count: subscribers?.length || 0,
      subscribers: subscribers || []
    });

  } catch (error) {
    console.error('❌ Error in get subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send marketing email to all subscribers (admin only)
router.post('/send-marketing', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {

    const { title, message, products, ctaText, ctaLink, imageUrl, logoUrl, discountType, discountValue, promoCode } = req.body;

    if (!title || !message) {
      // Ensure CORS headers are set on error responses
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      return res.status(400).json({ 
        success: false,
        error: 'Title and message are required' 
      });
    }

    console.log('📧 Marketing email send request:', { title, recipientCount: 'all subscribers' });

    // Get all active subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from('newsletter_subscriptions')
      .select('email')
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Error fetching subscribers:', fetchError);
      
      // Ensure CORS headers are set on error responses
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch subscribers'
      });
    }

    if (!subscribers || subscribers.length === 0) {
      return res.json({
        success: true,
        message: 'No active subscribers found',
        sent: 0,
        failed: 0
      });
    }

    console.log(`📬 Sending marketing email to ${subscribers.length} subscribers...`);

    // Prepare marketing data
    const marketingData = {
      title,
      message,
      products: products || [],
      ctaText: ctaText || 'Shop Now',
      ctaLink: ctaLink || process.env.CLIENT_URL || 'https://yohanns-sportswear.onrender.com',
      imageUrl,
      logoUrl,
      discountType: discountType || 'none',
      discountValue: discountValue || '',
      promoCode: promoCode || ''
    };

    // Send emails to all subscribers
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    // Send emails in batches to avoid overwhelming the email service
    const batchSize = 10;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            // Replace {{email}} placeholder in template
            const emailData = { ...marketingData };
            if (emailData.message) {
              emailData.message = emailData.message.replace(/\{\{email\}\}/g, subscriber.email);
            }
            
            const result = await emailService.sendMarketingEmail(subscriber.email, emailData);
            if (result.success) {
              sentCount++;
            } else {
              failedCount++;
              errors.push({ email: subscriber.email, error: result.error });
            }
          } catch (emailError) {
            failedCount++;
            errors.push({ email: subscriber.email, error: emailError.message });
          }
        })
      );

      // Wait a bit between batches to avoid rate limiting
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Marketing email send complete: ${sentCount} sent, ${failedCount} failed`);

    res.json({
      success: true,
      message: `Marketing email sent to ${sentCount} subscribers`,
      sent: sentCount,
      failed: failedCount,
      total: subscribers.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error in send marketing email:', error);
    
    // Ensure CORS headers are set on error responses
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
});

module.exports = router;

