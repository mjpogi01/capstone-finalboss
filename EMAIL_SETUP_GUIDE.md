# Email Automation Setup Guide

This guide will help you set up the email automation system for Yohanns to send no-reply emails to customers when order statuses are updated.

## 📧 Email Configuration

### 1. Gmail Setup (Recommended)

1. **Create a Gmail account** for Yohanns business emails (e.g., `yohanns.orders@gmail.com`)

2. **Enable 2-Factor Authentication** on the Gmail account

3. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Save this password securely

### 2. Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration
EMAIL_USER=yohanns.orders@gmail.com
EMAIL_PASSWORD=your_16_character_app_password

# Client URL for email links
CLIENT_URL=https://your-domain.com
```

### 3. Alternative Email Providers

If you prefer other email providers, you can modify the email service configuration in `server/lib/emailService.js`:

#### Outlook/Hotmail:
```javascript
service: 'hotmail',
auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD
}
```

#### Custom SMTP:
```javascript
host: 'smtp.your-provider.com',
port: 587,
secure: false,
auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD
}
```

## 🚀 Features Implemented

### 1. Automatic Email Notifications

- **Order Confirmation**: Sent when a new order is created
- **Status Updates**: Sent when order status changes (pending → processing → completed → delivered)
- **No-Reply Format**: Professional emails with Yohanns branding

### 2. Email Templates

- **Professional HTML Templates**: Responsive design with Yohanns branding
- **Status-Specific Content**: Different messages for each order status
- **Customer Information**: Includes order details, amounts, and shipping info

### 3. API Endpoints

#### Test Email Service
```bash
POST /api/email/test
Content-Type: application/json

{
  "email": "test@example.com"
}
```

#### Send Order Status Update
```bash
POST /api/email/order-status/:orderId
Content-Type: application/json

{
  "status": "completed",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}
```

#### Bulk Status Updates
```bash
POST /api/email/bulk-status-update
Content-Type: application/json

{
  "orderIds": ["order1", "order2", "order3"],
  "status": "delivered"
}
```

#### Check Email Service Status
```bash
GET /api/email/status
```

## 🔧 Integration Points

### 1. Order Status Updates

The email automation is automatically integrated into:
- `PATCH /api/orders/:id/status` - Sends email when status changes
- `POST /api/orders` - Sends confirmation email for new orders

### 2. Frontend Integration

The order status update buttons in the admin panel will now automatically trigger emails when:
- Processing → Completed
- Completed → Delivered

### 3. Error Handling

- Email failures don't break the order update process
- Detailed error logging for troubleshooting
- Fallback options for manual email sending

## 📋 Email Templates

### Order Status Update Email Includes:

- **Header**: Yohanns branding with basketball theme
- **Status Card**: Visual status indicator with color coding
- **Order Information**: Order number, date, amount, shipping method
- **Call-to-Action**: Link to view orders
- **Footer**: Contact information and branding

### Status Colors:
- 🟡 **Pending**: Orange (#f59e0b)
- 🔵 **Processing**: Blue (#3b82f6)
- 🟢 **Completed**: Green (#10b981)
- 🟢 **Delivered**: Dark Green (#059669)
- 🔴 **Cancelled**: Red (#ef4444)

## 🧪 Testing

### 1. Test Email Service
```bash
curl -X POST http://localhost:4000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### 2. Test Order Status Update
```bash
curl -X PATCH http://localhost:4000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### 3. Check Service Status
```bash
curl http://localhost:4000/api/email/status
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"Email service configuration error"**
   - Check EMAIL_USER and EMAIL_PASSWORD in .env
   - Verify Gmail app password is correct
   - Ensure 2FA is enabled on Gmail account

2. **"Failed to send email"**
   - Check internet connection
   - Verify Gmail account isn't locked
   - Try generating a new app password

3. **Emails going to spam**
   - Add SPF record for your domain
   - Use a professional email address
   - Include unsubscribe links (future enhancement)

### Debug Mode:

Enable detailed logging by checking the server console for:
- ✅ Email sent successfully messages
- ❌ Email configuration errors
- 📧 Email delivery confirmations

## 🔮 Future Enhancements

- [ ] Email templates customization
- [ ] SMS notifications integration
- [ ] Email analytics and tracking
- [ ] Automated delivery notifications
- [ ] Customer review request emails
- [ ] Newsletter integration
- [ ] Multi-language support

## 📞 Support

If you encounter any issues with the email automation system:

1. Check the server console logs
2. Verify environment variables
3. Test with the `/api/email/test` endpoint
4. Contact the development team

---

**Note**: This email automation system is designed to work seamlessly with the existing order management system. All emails are sent from a no-reply address to maintain professionalism and avoid reply loops.













































