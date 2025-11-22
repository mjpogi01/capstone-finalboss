const express = require('express');
const { query } = require('../lib/db');
const emailService = require('../lib/emailService');
const router = express.Router();

// Test email service
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const result = await emailService.sendTestEmail(email);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send test email',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Error in test email route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send order status update email manually
router.post('/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, customerEmail, customerName } = req.body;

    if (!status || !customerEmail) {
      return res.status(400).json({ 
        error: 'Status and customer email are required' 
      });
    }

    // Get order data
    const orderQuery = `
      SELECT 
        o.*,
        u.email as customer_email,
        u.raw_user_meta_data->>'full_name' as customer_name
      FROM orders o
      LEFT JOIN auth.users u ON o.user_id = u.id
      WHERE o.id = $1
    `;

    const result = await query(orderQuery, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = result.rows[0];
    const finalCustomerEmail = customerEmail || orderData.customer_email;
    const finalCustomerName = customerName || orderData.customer_name;

    if (!finalCustomerEmail) {
      return res.status(400).json({ 
        error: 'Customer email not found for this order' 
      });
    }

    const emailResult = await emailService.sendOrderStatusUpdate(
      orderData,
      finalCustomerEmail,
      finalCustomerName,
      status
    );

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'Order status email sent successfully',
        messageId: emailResult.messageId,
        sentTo: finalCustomerEmail
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send order status email',
        details: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error in order status email route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send order confirmation email
router.post('/order-confirmation/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerEmail, customerName } = req.body;

    // Get order data
    const orderQuery = `
      SELECT 
        o.*,
        u.email as customer_email,
        u.raw_user_meta_data->>'full_name' as customer_name
      FROM orders o
      LEFT JOIN auth.users u ON o.user_id = u.id
      WHERE o.id = $1
    `;

    const result = await query(orderQuery, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = result.rows[0];
    const finalCustomerEmail = customerEmail || orderData.customer_email;
    const finalCustomerName = customerName || orderData.customer_name;

    if (!finalCustomerEmail) {
      return res.status(400).json({ 
        error: 'Customer email not found for this order' 
      });
    }

    const emailResult = await emailService.sendOrderConfirmation(
      orderData,
      finalCustomerEmail,
      finalCustomerName
    );

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'Order confirmation email sent successfully',
        messageId: emailResult.messageId,
        sentTo: finalCustomerEmail
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send order confirmation email',
        details: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error in order confirmation email route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send bulk order status emails
router.post('/bulk-status-update', async (req, res) => {
  try {
    const { orderIds, status } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: 'Order IDs array is required' 
      });
    }

    if (!status) {
      return res.status(400).json({ 
        error: 'Status is required' 
      });
    }

    const results = [];
    const errors = [];

    for (const orderId of orderIds) {
      try {
        // Get order data
        const orderQuery = `
          SELECT 
            o.*,
            u.email as customer_email,
            u.raw_user_meta_data->>'full_name' as customer_name
          FROM orders o
          LEFT JOIN auth.users u ON o.user_id = u.id
          WHERE o.id = $1
        `;

        const result = await query(orderQuery, [orderId]);

        if (result.rows.length === 0) {
          errors.push({ orderId, error: 'Order not found' });
          continue;
        }

        const orderData = result.rows[0];

        if (!orderData.customer_email) {
          errors.push({ orderId, error: 'Customer email not found' });
          continue;
        }

        const emailResult = await emailService.sendOrderStatusUpdate(
          orderData,
          orderData.customer_email,
          orderData.customer_name,
          status
        );

        if (emailResult.success) {
          results.push({
            orderId,
            success: true,
            messageId: emailResult.messageId,
            sentTo: orderData.customer_email
          });
        } else {
          errors.push({
            orderId,
            error: emailResult.error
          });
        }

      } catch (error) {
        errors.push({ orderId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk email operation completed`,
      results,
      errors,
      summary: {
        total: orderIds.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Error in bulk status update email route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get email service status
router.get('/status', async (req, res) => {
  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const isConfigured = Boolean(process.env.RESEND_API_KEY && fromAddress);

    res.json({
      success: true,
      configured: isConfigured,
      service: 'resend',
      provider: 'Resend',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in email status route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;













































