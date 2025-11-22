const { Resend } = require('resend');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class EmailService {
  constructor() {
    this.client = null;
    this.fromAddress = null;
    this.initializeClient();
  }

  initializeClient() {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const fromAddress = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;

      if (!apiKey) {
        console.warn('⚠️ Email service not configured: RESEND_API_KEY not set');
        this.client = null;
        return;
      }

      if (!fromAddress) {
        console.warn('⚠️ Email service not configured: RESEND_FROM_EMAIL/EMAIL_FROM/EMAIL_USER not set');
        this.client = null;
        return;
      }

      this.client = new Resend(apiKey);
      this.fromAddress = fromAddress;
      console.log('✅ Resend email client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message || error);
      this.client = null;
    }
  }

  // Send order status update email
  async sendOrderStatusUpdate(orderData, customerEmail, customerName, newStatus, previousStatus = null) {
    try {
      if (!this._isClientReady()) {
        return { success: false, error: 'Email service not configured' };
      }

      const emailTemplate = this.getOrderStatusEmailTemplate(
        orderData, 
        customerName, 
        newStatus, 
        previousStatus
      );

      console.log('ORDER STATUS FROM:', JSON.stringify(this.fromAddress));

      const mailOptions = {
        from: {
          name: 'Yohanns - No Reply',
          address: this.fromAddress
        },
        to: customerEmail,
        subject: `Order ${orderData.order_number} Status Update - ${this.getStatusDisplayName(newStatus)}`,
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const result = await this._sendEmailWithRetry(mailOptions, 2);
      console.log('✅ Order status email sent successfully:', result.id);
      return { success: true, messageId: result.id };

    } catch (error) {
      console.error('❌ Failed to send order status email:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper to verify Resend client availability
  _isClientReady() {
    if (!this.client || !this.fromAddress) {
      console.warn('⚠️ Email service not available - Resend client not initialized');
      return false;
    }
    return true;
  }

  _formatFromAddress(fromOption) {
    if (!fromOption) {
      return this.fromAddress;
    }
    if (typeof fromOption === 'string') {
      return fromOption;
    }
    if (typeof fromOption === 'object' && fromOption.address) {
      return fromOption.name ? `${fromOption.name} <${fromOption.address}>` : fromOption.address;
    }
    return this.fromAddress;
  }

  _normalizeMailOptions(mailOptions = {}) {
    return {
      from: this._formatFromAddress(mailOptions.from),
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
      reply_to: mailOptions.replyTo || mailOptions.reply_to
    };
  }

  // Helper method to send email with retry logic and timeout handling
  async _sendEmailWithRetry(mailOptions, maxRetries = 3) {
    if (!this._isClientReady()) {
      throw new Error('Email service not configured');
    }

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const normalizedOptions = this._normalizeMailOptions(mailOptions);
        const { data, error } = await this.client.emails.send(normalizedOptions);

        if (error) {
          const resendError = new Error(error.message || 'Resend API error');
          resendError.code = error.code;
          throw resendError;
        }

        return { id: data?.id || null };
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries) {
          throw error;
        }

        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Email send attempt ${attempt}/${maxRetries} failed (${error.message || error}). Retrying in ${waitTime / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.initializeClient();
      }
    }

    throw lastError;
  }

  // Send order confirmation email
  async sendOrderConfirmation(orderData, customerEmail, customerName) {
    try {
      if (!this._isClientReady()) {
        return { success: false, error: 'Email service not configured' };
      }
      
      const emailTemplate = this.getOrderConfirmationEmailTemplate(orderData, customerName);

      const mailOptions = {
        from: {
          name: 'Yohanns - No Reply',
          address: this.fromAddress
        },
        to: customerEmail,
        subject: `Order Confirmation - ${orderData.order_number}`,
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const result = await this._sendEmailWithRetry(mailOptions, 2);
      console.log('✅ Order confirmation email sent successfully:', result.id);
      return { success: true, messageId: result.id };

    } catch (error) {
      // Log detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      };
      
      console.error('❌ Failed to send order confirmation email:', errorDetails);
      
      // Return user-friendly error message
      let errorMessage = 'Failed to send email';
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        errorMessage = 'Email service timeout - connection timed out';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Email service connection refused - check network settings';
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed - check credentials';
      }
      
      return { success: false, error: errorMessage, details: errorDetails };
    }
  }

  // Send custom design order confirmation email
  async sendCustomDesignConfirmation(orderData, customerEmail, customerName) {
    try {
      if (!this._isClientReady()) {
        return { success: false, error: 'Email service not configured' };
      }
      const emailTemplate = this.getCustomDesignConfirmationEmailTemplate(orderData, customerName);

      const mailOptions = {
        from: {
          name: 'Yohanns - No Reply',
          address: this.fromAddress
        },
        to: customerEmail,
        subject: `Custom Design Order Confirmation - ${orderData.order_number}`,
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const result = await this._sendEmailWithRetry(mailOptions, 2);
      console.log('✅ Custom design confirmation email sent successfully:', result.id);
      return { success: true, messageId: result.id };

    } catch (error) {
      console.error('❌ Failed to send custom design confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Get status display name
  getStatusDisplayName(status) {
    const statusMap = {
      'pending': 'Pending Review',
      'confirmed': 'Order Confirmed',
      'layout': 'Layout Stage',
      'sizing': 'Sizing Stage',
      'printing': 'Printing Stage',
      'press': 'Press Stage',
      'prod': 'Production Stage',
      'packing_completing': 'Packing & Completing',
      'picked_up_delivered': 'Picked Up / Delivered',
      'cancelled': 'Cancelled',
      // Legacy statuses
      'processing': 'In Production',
      'completed': 'Ready for Pickup/Delivery',
      'delivered': 'Delivered',
      'in_store': 'In Store Branch',
      'on_the_way': 'On The Way'
    };
    return statusMap[status] || status;
  }

  // Get status description
  getStatusDescription(status) {
    const descriptions = {
      'pending': 'Your order is being reviewed and will be processed soon.',
      'confirmed': 'Your order has been confirmed and is ready to enter production.',
      'layout': 'Our design team is working on the layout for your custom items.',
      'sizing': 'We are finalizing the sizing specifications for your order.',
      'printing': 'Your designs are being printed. This is where the magic happens!',
      'press': 'Your items are being pressed to ensure perfect quality and durability.',
      'prod': 'Your order is in the final production stage. Almost ready!',
      'packing_completing': 'Great news! Your order is being packed and will be ready soon.',
      'picked_up_delivered': 'Your order has been picked up or delivered. Thank you for choosing Yohanns!',
      'cancelled': 'Your order has been cancelled. If you have any questions, please contact our support team.',
      // Legacy statuses
      'processing': 'Your order is currently in production. Our team is working on creating your custom items.',
      'completed': 'Great news! Your order is ready. You can now pick it up from your selected branch or we will deliver it to you.',
      'delivered': 'Your order has been successfully delivered. Thank you for choosing Yohanns!',
      'in_store': 'Your order is being prepared at our store branch and will be ready soon.',
      'on_the_way': 'Your order is on its way to your location. You can track its progress in your account.'
    };
    return descriptions[status] || 'Your order status has been updated.';
  }

  // Get status color
  getStatusColor(status) {
    const colors = {
      'pending': '#f59e0b',        // Orange
      'confirmed': '#10b981',      // Green
      'layout': '#3b82f6',         // Blue
      'sizing': '#8b5cf6',         // Purple
      'printing': '#ec4899',       // Pink
      'press': '#f97316',          // Orange-Red
      'prod': '#14b8a6',           // Teal
      'packing_completing': '#22c55e', // Light Green
      'picked_up_delivered': '#059669', // Dark Green
      'cancelled': '#ef4444',      // Red
      // Legacy statuses
      'processing': '#3b82f6',
      'completed': '#10b981',
      'delivered': '#059669',
      'in_store': '#3b82f6',
      'on_the_way': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }

  // Generate order status email template
  getOrderStatusEmailTemplate(orderData, customerName, newStatus, previousStatus) {
    const statusName = this.getStatusDisplayName(newStatus);
    const statusDescription = this.getStatusDescription(newStatus);
    const statusColor = this.getStatusColor(newStatus);
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            .content {
                padding: 30px;
            }
            .status-card {
                background-color: #f8f9fa;
                border-left: 4px solid ${statusColor};
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .status-title {
                font-size: 20px;
                font-weight: bold;
                color: ${statusColor};
                margin: 0 0 10px 0;
            }
            .status-description {
                color: #666;
                margin: 0;
            }
            .order-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .order-info h3 {
                margin: 0 0 15px 0;
                color: #1a1a2e;
                font-size: 18px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 5px 0;
            }
            .info-label {
                font-weight: 600;
                color: #555;
            }
            .info-value {
                color: #333;
            }
            .footer {
                background-color: #1a1a2e;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
            }
            .footer a {
                color: #00bfff;
                text-decoration: none;
            }
            .cta-button {
                display: inline-block;
                background-color: #00bfff;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: 600;
                margin: 20px 0;
            }
            .no-reply {
                background-color: #e5e7eb;
                color: #6b7280;
                padding: 10px;
                border-radius: 5px;
                text-align: center;
                font-size: 12px;
                margin-top: 20px;
            }
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .content, .header, .footer {
                    padding: 20px;
                }
                .info-row {
                    flex-direction: column;
                }
                .info-label {
                    margin-bottom: 2px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏀 YOHANNS</h1>
                <p>Order Status Update</p>
            </div>
            
            <div class="content">
                <h2>Hello ${customerName || 'Valued Customer'}!</h2>
                
                <p>We have an update regarding your order. Here are the details:</p>
                
                <div class="status-card">
                    <div class="status-title">📦 ${statusName}</div>
                    <div class="status-description">${statusDescription}</div>
                </div>
                
                <div class="order-info">
                    <h3>📋 Order Information</h3>
                    <div class="info-row">
                        <span class="info-label">Order Number:</span>
                        <span class="info-value">${orderData.order_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Order Date:</span>
                        <span class="info-value">${new Date(orderData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Total Amount:</span>
                        <span class="info-value">₱${parseFloat(orderData.total_amount).toFixed(2)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Shipping Method:</span>
                        <span class="info-value">${orderData.shipping_method === 'pickup' ? 'Pickup' : 'Cash on Delivery'}</span>
                    </div>
                    ${orderData.pickup_location ? `
                    <div class="info-row">
                        <span class="info-label">Pickup Location:</span>
                        <span class="info-value">${orderData.pickup_location}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.CLIENT_URL || 'https://yohanns.com'}/orders" class="cta-button">
                        View Your Orders
                    </a>
                </div>
                
                <p>If you have any questions about your order, please don't hesitate to contact our customer support team.</p>
                
                <p>Thank you for choosing Yohanns!</p>
                
                <div class="no-reply">
                    This is an automated message. Please do not reply to this email.
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Yohanns - Premium Sports Apparel</strong></p>
                <p>📍 Multiple Locations Across the Philippines</p>
                <p>📧 support@yohanns.com | 📞 +63 (XXX) XXX-XXXX</p>
                <p><a href="${process.env.CLIENT_URL || 'https://yohanns.com'}">Visit Our Website</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
    Order Status Update - Yohanns
    
    Hello ${customerName || 'Valued Customer'}!
    
    Your order ${orderData.order_number} status has been updated to: ${statusName}
    
    ${statusDescription}
    
    Order Information:
    - Order Number: ${orderData.order_number}
    - Order Date: ${new Date(orderData.created_at).toLocaleDateString()}
    - Total Amount: ₱${parseFloat(orderData.total_amount).toFixed(2)}
    - Shipping Method: ${orderData.shipping_method === 'pickup' ? 'Pickup' : 'Cash on Delivery'}
    ${orderData.pickup_location ? `- Pickup Location: ${orderData.pickup_location}` : ''}
    
    If you have any questions, please contact our customer support team.
    
    Thank you for choosing Yohanns!
    
    This is an automated message. Please do not reply to this email.
    `;

    return { html, text };
  }

  // Generate order confirmation email template
  getOrderConfirmationEmailTemplate(orderData, customerName) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .success-badge {
                background-color: #10b981;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 18px;
                font-weight: bold;
            }
            .content {
                padding: 30px;
            }
            .order-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 5px 0;
            }
            .info-label {
                font-weight: 600;
                color: #555;
            }
            .info-value {
                color: #333;
            }
            .footer {
                background-color: #1a1a2e;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏀 YOHANNS</h1>
                <p>Order Confirmation</p>
            </div>
            
            <div class="success-badge">
                ✅ Order Confirmed Successfully!
            </div>
            
            <div class="content">
                <h2>Thank you for your order, ${customerName || 'Valued Customer'}!</h2>
                
                <p>We have received your order and will begin processing it shortly. Here are your order details:</p>
                
                <div class="order-info">
                    <div class="info-row">
                        <span class="info-label">Order Number:</span>
                        <span class="info-value">${orderData.order_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Order Date:</span>
                        <span class="info-value">${new Date(orderData.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Total Amount:</span>
                        <span class="info-value">₱${parseFloat(orderData.total_amount).toFixed(2)}</span>
                    </div>
                </div>
                
                <p>We'll send you email updates as your order progresses. Thank you for choosing Yohanns!</p>
            </div>
            
            <div class="footer">
                <p><strong>Yohanns - Premium Sports Apparel</strong></p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
    Order Confirmation - Yohanns
    
    Thank you for your order, ${customerName || 'Valued Customer'}!
    
    Your order ${orderData.order_number} has been confirmed and we will begin processing it shortly.
    
    Order Details:
    - Order Number: ${orderData.order_number}
    - Order Date: ${new Date(orderData.created_at).toLocaleDateString()}
    - Total Amount: ₱${parseFloat(orderData.total_amount).toFixed(2)}
    
    We'll send you email updates as your order progresses.
    
    Thank you for choosing Yohanns!
    `;

    return { html, text };
  }

  // Get custom design confirmation email template
  getCustomDesignConfirmationEmailTemplate(orderData, customerName) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Custom Design Order Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { padding: 20px; }
            .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .team-members { margin: 15px 0; }
            .member-item { background: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
            .highlight { color: #667eea; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎨 Custom Design Order Confirmed!</h1>
                <p>Thank you for choosing Yohanns for your custom team apparel!</p>
            </div>
            
            <div class="content">
                <p>Dear ${customerName || 'Valued Customer'},</p>
                
                <p>We're excited to work on your custom design order! Your order has been confirmed and our design team will begin processing it shortly.</p>
                
                <div class="order-details">
                    <h3>📋 Order Details</h3>
                    <p><strong>Order Number:</strong> <span class="highlight">${orderData.order_number}</span></p>
                    <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleDateString()}</p>
                    <p><strong>Team Name:</strong> ${orderData.order_items?.[0]?.team_name || 'N/A'}</p>
                    <p><strong>Total Amount:</strong> <span class="highlight">₱${parseFloat(orderData.total_amount).toFixed(2)}</span></p>
                    <p><strong>Shipping Method:</strong> ${orderData.shipping_method === 'pickup' ? 'Pickup' : 'Delivery'}</p>
                    ${orderData.shipping_method === 'delivery' ? `<p><strong>Delivery Address:</strong> ${orderData.delivery_address?.address || 'N/A'}</p>` : ''}
                </div>
                
                <div class="team-members">
                    <h3>👥 Team Members (${orderData.order_items?.[0]?.team_members?.length || 0})</h3>
                    ${(orderData.order_items?.[0]?.team_members || []).map(member => `
                        <div class="member-item">
                            <strong>Jersey #${member.number}</strong> - ${member.surname} (Jersey: ${member.size || member.jerseySize || 'N/A'}, Shorts: ${member.shortsSize || 'N/A'} - ${member.sizingType})
                        </div>
                    `).join('')}
                </div>
                
                ${orderData.order_items?.[0]?.design_images && orderData.order_items[0].design_images.length > 0 ? `
                <div class="design-images">
                    <h3>🎨 Design Images</h3>
                    <p>We've received ${orderData.order_items[0].design_images.length} design image(s) for your custom order.</p>
                </div>
                ` : ''}
                
                ${orderData.order_notes ? `
                <div class="order-notes">
                    <h3>📝 Special Instructions</h3>
                    <p>${orderData.order_notes}</p>
                </div>
                ` : ''}
                
                <div class="next-steps">
                    <h3>🔄 What's Next?</h3>
                    <ul>
                        <li>Our design team will review your requirements and design images</li>
                        <li>We'll contact you within 2-3 business days to discuss the design details</li>
                        <li>Once approved, we'll begin production of your custom team apparel</li>
                        <li>You'll receive updates via email as your order progresses</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need to make changes to your order, please contact us immediately.</p>
                
                <p>Thank you for choosing Yohanns for your custom team apparel needs!</p>
            </div>
            
            <div class="footer">
                <p><strong>Yohanns - Premium Sports Apparel</strong></p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
    Custom Design Order Confirmation - Yohanns
    
    Dear ${customerName || 'Valued Customer'},
    
    We're excited to work on your custom design order! Your order has been confirmed and our design team will begin processing it shortly.
    
    Order Details:
    - Order Number: ${orderData.order_number}
    - Order Date: ${new Date(orderData.created_at).toLocaleDateString()}
    - Team Name: ${orderData.order_items?.[0]?.team_name || 'N/A'}
    - Total Amount: ₱${parseFloat(orderData.total_amount).toFixed(2)}
    - Shipping Method: ${orderData.shipping_method === 'pickup' ? 'Pickup' : 'Delivery'}
    ${orderData.shipping_method === 'delivery' ? `- Delivery Address: ${orderData.delivery_address?.address || 'N/A'}` : ''}
    
    Team Members (${orderData.order_items?.[0]?.team_members?.length || 0}):
    ${(orderData.order_items?.[0]?.team_members || []).map(member => `- Jersey #${member.number} - ${member.surname} (${member.size} - ${member.sizingType})`).join('\n')}
    
    ${orderData.order_items?.[0]?.design_images && orderData.order_items[0].design_images.length > 0 ? `Design Images: We've received ${orderData.order_items[0].design_images.length} design image(s) for your custom order.\n` : ''}
    ${orderData.order_notes ? `Special Instructions: ${orderData.order_notes}\n` : ''}
    
    What's Next:
    1. Our design team will review your requirements and design images
    2. We'll contact you within 2-3 business days to discuss the design details
    3. Once approved, we'll begin production of your custom team apparel
    4. You'll receive updates via email as your order progresses
    
    If you have any questions or need to make changes to your order, please contact us immediately.
    
    Thank you for choosing Yohanns for your custom team apparel needs!
    `;

    return { html, text };
  }

  // Send email verification code
  async sendVerificationCode(email, verificationCode, userName = null) {
    try {
      if (!this._isClientReady()) {
        return { success: false, error: 'Email service not configured' };
      }
      const mailOptions = {
        from: {
          name: 'Yohanns - Email Verification',
          address: this.fromAddress
        },
        to: email,
        subject: 'Verify Your Email - Yohanns',
        html: this.getVerificationCodeEmailTemplate(verificationCode, userName),
        text: this.getVerificationCodeEmailTextTemplate(verificationCode, userName)
      };

      const result = await this._sendEmailWithRetry(mailOptions, 2);
      console.log('✅ Verification code email sent successfully:', result.id);
      return { success: true, messageId: result.id };

    } catch (error) {
      console.error('❌ Failed to send verification code email:', error);
      return { success: false, error: error.message };
    }
  }

  // Get verification code email HTML template
  getVerificationCodeEmailTemplate(code, userName = null) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .content {
                padding: 30px;
            }
            .code-container {
                background-color: #f8f9fa;
                border: 2px dashed #1a1a2e;
                border-radius: 8px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
            }
            .verification-code {
                font-size: 36px;
                font-weight: bold;
                color: #1a1a2e;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
                margin: 10px 0;
            }
            .code-label {
                color: #666;
                font-size: 14px;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .footer {
                background-color: #1a1a2e;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
            }
            .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
                color: #856404;
            }
            .warning strong {
                display: block;
                margin-bottom: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏀 YOHANNS</h1>
                <p>Email Verification</p>
            </div>
            
            <div class="content">
                <h2>Hello ${userName || 'there'}!</h2>
                
                <p>Thank you for signing up with Yohanns. Please use the verification code below to complete your registration:</p>
                
                <div class="code-container">
                    <div class="code-label">Your Verification Code</div>
                    <div class="verification-code">${code}</div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important:</strong>
                    This code will expire in 10 minutes. Please enter it in the verification popup to activate your account.
                </div>
                
                <p>If you didn't create an account with Yohanns, please ignore this email.</p>
                
                <p>Thank you for choosing Yohanns!</p>
            </div>
            
            <div class="footer">
                <p><strong>Yohanns - Premium Sports Apparel</strong></p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Get verification code email text template
  getVerificationCodeEmailTextTemplate(code, userName = null) {
    return `
    Email Verification - Yohanns
    
    Hello ${userName || 'there'}!
    
    Thank you for signing up with Yohanns. Please use the verification code below to complete your registration:
    
    Your Verification Code: ${code}
    
    ⚠️ Important: This code will expire in 10 minutes. Please enter it in the verification popup to activate your account.
    
    If you didn't create an account with Yohanns, please ignore this email.
    
    Thank you for choosing Yohanns!
    
    This is an automated message. Please do not reply to this email.
    `;
  }

  // Test email functionality
  async sendTestEmail(toEmail) {
    try {
      if (!this._isClientReady()) {
        return { success: false, error: 'Email service not configured' };
      }
      const mailOptions = {
        from: {
          name: 'Yohanns - Test',
          address: this.fromAddress
        },
        to: toEmail,
        subject: 'Yohanns Email Service Test',
        html: `
          <h2>Email Service Test</h2>
          <p>This is a test email from Yohanns email automation system.</p>
          <p>If you received this email, the email service is working correctly!</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `,
        text: 'This is a test email from Yohanns email automation system. If you received this email, the email service is working correctly!'
      };

      const result = await this._sendEmailWithRetry(mailOptions, 2);
      console.log('✅ Test email sent successfully:', result.id);
      return { success: true, messageId: result.id };

    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send newsletter welcome email
  async sendNewsletterWelcomeEmail(subscriberEmail) {
    try {
      if (!this._isClientReady()) {
        return { success: false, error: 'Email service not configured' };
      }
      const emailTemplate = this.getNewsletterWelcomeEmailTemplate(subscriberEmail);

      const mailOptions = {
        from: {
          name: 'Yohanns - Newsletter',
          address: this.fromAddress
        },
        to: subscriberEmail,
        subject: 'Welcome to Yohanns Newsletter! 🏀',
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const result = await this._sendEmailWithRetry(mailOptions, 2);
      console.log('✅ Newsletter welcome email sent successfully:', result.id);
      return { success: true, messageId: result.id };

    } catch (error) {
      console.error('❌ Failed to send newsletter welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send marketing email to subscribers
  async sendMarketingEmail(subscriberEmail, marketingData) {
    try {
      if (!this._isClientReady()) {
        return { success: false, error: 'Email service not configured' };
      }
      const emailTemplate = this.getMarketingEmailTemplate(marketingData, subscriberEmail);

      const mailOptions = {
        from: {
          name: 'Yohanns - Special Offers',
          address: this.fromAddress
        },
        to: subscriberEmail,
        subject: marketingData.title || 'Special Offer from Yohanns',
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const result = await this._sendEmailWithRetry(mailOptions, 2);
      console.log('✅ Marketing email sent successfully:', result.id);
      return { success: true, messageId: result.id };

    } catch (error) {
      console.error('❌ Failed to send marketing email:', error);
      return { success: false, error: error.message };
    }
  }

  // Get newsletter welcome email template
  getNewsletterWelcomeEmailTemplate(subscriberEmail = '') {
    // Use localhost for development, otherwise use CLIENT_URL or production URL
    const clientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://yohanns-sportswear.onrender.com');
    // Get logo URL from Cloudinary or fallback to client URL
    const logoUrl = process.env.EMAIL_LOGO_URL || 
                    (process.env.CLOUDINARY_CLOUD_NAME 
                      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/yohanns-logo.png`
                      : `${clientUrl}/yohanns-logo.png`);
    // Encode email for unsubscribe link
    const unsubscribeLink = subscriberEmail 
      ? `${clientUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`
      : `${clientUrl}/unsubscribe`;
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Yohanns Newsletter</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .content {
                padding: 30px;
            }
            .welcome-badge {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .footer {
                background-color: #1a1a2e;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
            }
            .cta-button {
                display: inline-block;
                padding: 12px 30px;
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
            }
            .header-logo {
                max-width: 150px;
                width: 150px;
                height: auto;
                margin: 0 auto 15px;
                display: block;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
                    <tr>
                        <td align="center" style="padding-bottom: 15px;">
                            <img src="${logoUrl}" alt="YOHANNS" class="header-logo" width="150" style="max-width: 150px; width: 150px; height: auto; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <p>Welcome to Our Newsletter!</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="content">
                <div class="welcome-badge">
                    🎉 Thank You for Subscribing!
                </div>
                
                <h2>Welcome to the Yohanns Family!</h2>
                
                <p>We're thrilled to have you join our community of sports enthusiasts and athletes!</p>
                
                <p>As a subscriber, you'll be the first to know about:</p>
                <ul>
                    <li>🔥 Exclusive discounts and special promotions</li>
                    <li>🆕 New product launches and collections</li>
                    <li>🏆 Sports tips and updates</li>
                    <li>🎁 Early access to sales and events</li>
                </ul>
                
                <p>Stay tuned for exciting updates and exclusive offers coming your way!</p>
                
                <div style="text-align: center;">
                    <a href="${clientUrl}" class="cta-button">
                        Visit Our Store
                    </a>
                </div>
                
                <p>Thank you for choosing Yohanns - where quality meets passion!</p>
            </div>
            
            <div class="footer">
                <p><strong>Yohanns - Premium Sports Apparel</strong></p>
                <p>This is an automated message. Please do not reply to this email.</p>
                <p><a href="${unsubscribeLink}" style="color: #00bfff;">Unsubscribe</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
    Welcome to Yohanns Newsletter!
    
    Thank you for subscribing!
    
    We're thrilled to have you join our community of sports enthusiasts and athletes!
    
    As a subscriber, you'll be the first to know about:
    - Exclusive discounts and special promotions
    - New product launches and collections
    - Sports tips and updates
    - Early access to sales and events
    
    Stay tuned for exciting updates and exclusive offers coming your way!
    
    Visit our store: ${clientUrl}
    
    Thank you for choosing Yohanns - where quality meets passion!
    
    This is an automated message. Please do not reply to this email.
    `;

    return { html, text };
  }

  // Get marketing email template
  getMarketingEmailTemplate(marketingData, subscriberEmail = '') {
    const { title, message, discountType, discountValue, promoCode, ctaText, ctaLink, imageUrl, logoUrl } = marketingData;
    // Use localhost for development, otherwise use CLIENT_URL or production URL
    const clientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://yohanns-sportswear.onrender.com');
    // Encode email for unsubscribe link
    const unsubscribeLink = subscriberEmail 
      ? `${clientUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`
      : `${clientUrl}/unsubscribe`;
    
    // Escape HTML in user-provided content for security
    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
    const safeTitle = escapeHtml(title || 'Special Offer');
    const safeMessage = escapeHtml(message || '');
    const safeCtaText = escapeHtml(ctaText || 'Shop Now');
    const safePromoCode = promoCode ? escapeHtml(promoCode) : '';
    
    let discountSection = '';
    if (discountType === 'percentage' && discountValue) {
      discountSection = `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px 15px; text-align: center; border-radius: 10px; margin: 20px 0; word-wrap: break-word; overflow-wrap: break-word;">
          <h2 style="margin: 0 0 8px 0; font-size: clamp(24px, 6vw, 36px); font-weight: bold; line-height: 1.2;">${escapeHtml(discountValue)}% OFF</h2>
          <p style="margin: 0 0 8px 0; font-size: clamp(16px, 4vw, 20px); font-weight: bold; line-height: 1.3;">Special Discount!</p>
          ${safePromoCode ? `<p style="margin: 8px 0 0 0; font-size: clamp(14px, 3.5vw, 18px); word-break: break-word; line-height: 1.4;">Use code: <strong style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-left: 4px;">${safePromoCode}</strong></p>` : ''}
        </div>
      `;
    } else if (discountType === 'fixed' && discountValue) {
      discountSection = `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px 15px; text-align: center; border-radius: 10px; margin: 20px 0; word-wrap: break-word; overflow-wrap: break-word;">
          <h2 style="margin: 0 0 8px 0; font-size: clamp(24px, 6vw, 36px); font-weight: bold; line-height: 1.2;">₱${escapeHtml(discountValue)} OFF</h2>
          <p style="margin: 0 0 8px 0; font-size: clamp(16px, 4vw, 20px); font-weight: bold; line-height: 1.3;">Special Discount!</p>
          ${safePromoCode ? `<p style="margin: 8px 0 0 0; font-size: clamp(14px, 3.5vw, 18px); word-break: break-word; line-height: 1.4;">Use code: <strong style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-left: 4px;">${safePromoCode}</strong></p>` : ''}
        </div>
      `;
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${safeTitle}</title>
        <!--[if mso]>
        <style type="text/css">
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        </style>
        <![endif]-->
        <style>
            /* Reset styles for email clients */
            body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            table, td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            img {
                -ms-interpolation-mode: bicubic;
                border: 0;
                outline: none;
                text-decoration: none;
            }
            
            /* Base styles */
            body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #f8f9fa;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                width: 100% !important;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            
            /* Container */
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background-color: #f8f9fa;
                padding: 10px;
            }
            
            .container {
                background-color: #ffffff;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                width: 100%;
            }
            
            /* Header */
            .header {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #ffffff;
                padding: clamp(20px, 5vw, 30px) clamp(15px, 4vw, 30px);
                text-align: center;
            }
            .header h1 {
                margin: 0 0 8px 0;
                font-size: clamp(22px, 5.5vw, 28px);
                font-weight: bold;
                line-height: 1.3;
            }
            .header-logo {
                max-width: 150px;
                width: 150px;
                height: auto;
                margin: 0 auto;
                display: block;
                border: 0;
                outline: none;
                text-decoration: none;
            }
            .header p {
                margin: 0;
                font-size: clamp(16px, 4vw, 18px);
                opacity: 0.95;
                line-height: 1.4;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            /* Content */
            .content {
                padding: clamp(20px, 5vw, 30px) clamp(15px, 4vw, 30px);
            }
            
            /* Image container */
            .image-container {
                text-align: center;
                margin: clamp(15px, 4vw, 20px) 0;
            }
            .image-container img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
            }
            
            /* Message */
            .message {
                white-space: pre-wrap;
                margin: 20px 0;
                line-height: 1.8;
                color: #333;
            }
            
            /* CTA Button */
            .cta-container {
                text-align: center;
                margin: clamp(20px, 5vw, 25px) 0;
            }
            .cta-button {
                display: inline-block;
                padding: clamp(14px, 3.5vw, 16px) clamp(30px, 8vw, 40px);
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: clamp(15px, 3.8vw, 17px);
                line-height: 1.4;
                min-height: 48px;
                box-sizing: border-box;
                word-wrap: break-word;
                overflow-wrap: break-word;
                text-align: center;
            }
            .cta-button:hover {
                background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
            }
            
            /* Footer */
            .footer {
                background-color: #1a1a2e;
                color: #ffffff;
                padding: clamp(15px, 4vw, 20px) clamp(15px, 4vw, 20px);
                text-align: center;
                font-size: clamp(12px, 3vw, 14px);
            }
            .footer a {
                color: #00bfff;
                text-decoration: underline;
            }
            
            /* Responsive */
            @media only screen and (max-width: 600px) {
                .email-wrapper {
                    padding: 5px;
                }
                .container {
                    border-radius: 0;
                }
                .header {
                    padding: 20px 15px;
                }
                .content {
                    padding: 20px 15px;
                }
                .cta-button {
                    width: 100%;
                    padding: 16px;
                }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="background-color: #f8f9fa; padding: 10px 0; min-height: 100vh;">
            <div class="email-wrapper">
                <div class="container">
                    <div class="header">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
                            ${logoUrl ? `
                            <tr>
                                <td align="center" style="padding-bottom: 15px;">
                                    <img src="${escapeHtml(logoUrl)}" alt="YOHANNS" class="header-logo" width="150" style="max-width: 150px; width: 150px; height: auto; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
                                </td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td align="center">
                                    <p>${safeTitle}</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="content">
                        ${imageUrl ? `<div class="image-container"><img src="${escapeHtml(imageUrl)}" alt="Promo Image" style="max-width: 100%; height: auto;" /></div>` : ''}
                        
                        ${discountSection}
                        
                        <div class="message">${safeMessage}</div>
                        
                        <div class="cta-container">
                            <a href="${ctaLink || clientUrl}" class="cta-button">
                                ${safeCtaText}
                            </a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Yohanns - Premium Sports Apparel</strong></p>
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p style="font-size: 11px; opacity: 0.8; margin-top: 10px;">
                            💡 <strong>Can't see images?</strong> Click "Display images" at the top of this email, or add us to your contacts to always show images.
                        </p>
                        <p><a href="${unsubscribeLink}" style="color: #00bfff; text-decoration: underline;">Unsubscribe</a></p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    let textMessage = message || '';
    if (discountType === 'percentage' && discountValue) {
      textMessage += `\n\n🎉 Special Offer: Get ${discountValue}% OFF on your next purchase!`;
      if (promoCode) {
        textMessage += `\nUse promo code: ${promoCode}`;
      }
    } else if (discountType === 'fixed' && discountValue) {
      textMessage += `\n\n🎉 Special Offer: Get ₱${discountValue} OFF on your next purchase!`;
      if (promoCode) {
        textMessage += `\nUse promo code: ${promoCode}`;
      }
    }

    const text = `
    ${title || 'Special Offer from Yohanns'}
    
    ${textMessage}
    
    ${ctaText || 'Shop Now'}: ${ctaLink || clientUrl}
    
    Yohanns - Premium Sports Apparel
    This is an automated message. Please do not reply to this email.
    `;

    return { html, text };
  }
}

module.exports = new EmailService();
