const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const productsRouter = require('./routes/products');
const uploadRouter = require('./routes/upload');
const userRouter = require('./routes/user');
const branchesRouter = require('./routes/branches');
const deleteRouter = require('./routes/delete');
const ordersRouter = require('./routes/orders');
const orderTrackingRouter = require('./routes/order-tracking');
const designUploadRouter = require('./routes/design-upload');
const customDesignRouter = require('./routes/custom-design');
const emailRouter = require('./routes/email');
const authVerificationRouter = require('./routes/auth-verification');
const analyticsRouter = require('./routes/analytics');
const aiRouter = require('./routes/ai');
const aiSchemaRouter = require('./routes/aiSchema');
const productionWorkflowRouter = require('./routes/production-workflow');
const chatRouter = require('./routes/chat');
const artistRouter = require('./routes/artist');
const branchChatRouter = require('./routes/branch-chat');
const newsletterRouter = require('./routes/newsletter');
// Using Supabase instead of local database

const app = express();

// CORS configuration - allow frontend domain in production
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.CLIENT_URL,
      'https://yohanns-sportswearhouse1.onrender.com', // Production frontend URL
      'http://localhost:3000' // for local testing
    ].filter(Boolean); // Remove undefined values
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.length === 0) {
      // If no origins configured, allow all in production (not ideal but prevents blocking)
      console.warn('⚠️  No CORS origins configured, allowing all origins');
      callback(null, true);
    } else if (allowedOrigins.some(allowed => {
      const allowedDomain = allowed.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const originDomain = origin.replace(/^https?:\/\//, '').replace(/^www\./, '');
      // Check exact match or if origin contains allowed domain
      return origin === allowed || originDomain === allowedDomain || originDomain.includes(allowedDomain) || allowedDomain.includes(originDomain);
    })) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      console.warn(`   NODE_ENV: ${process.env.NODE_ENV}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // Dynamically allow all headers that the browser requests
  // This prevents CORS errors for any header the browser sends
  allowedHeaders: function(req) {
    // Return the headers the browser requested, or allow all if not specified
    const requestedHeaders = req.headers['access-control-request-headers'];
    if (requestedHeaders) {
      return requestedHeaders.split(',').map(h => h.trim());
    }
    // If no specific headers requested, allow common ones
    return ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Accept'];
  },
  // Don't let CORS middleware handle OPTIONS - we handle it manually
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Handle OPTIONS requests BEFORE CORS middleware to ensure they're processed correctly
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('🔍 OPTIONS preflight request received:', req.path);
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      const requestedHeaders = req.headers['access-control-request-headers'];
      if (requestedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
      } else {
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept');
      }
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    console.log('✅ OPTIONS preflight response sent with status 204');
    return res.status(204).end();
  }
  next();
});

app.use(cors(corsOptions));

app.use(express.json());

// Root route - only show API info in development
// In production, this will be handled by static file serving
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (_req, res) => {
    res.json({ 
      message: 'Yohanns API Server',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        admin: '/api/admin',
        products: '/api/products',
        upload: '/api/upload',
        user: '/api/user',
        branches: '/api/branches',
        orders: '/api/orders',
        orderTracking: '/api/order-tracking',
        designUpload: '/api/design-upload',
        customDesign: '/api/custom-design',
        email: '/api/email',
        analytics: '/api/analytics',
        ai: '/api/ai',
        productionWorkflow: '/api/production-workflow',
        chat: '/api/chat',
        artist: '/api/artist',
        newsletter: '/api/newsletter'
      }
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Handle favicon.ico requests to prevent 404 errors
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end(); // Return 204 No Content instead of 404
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/user', userRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/delete', deleteRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/order-tracking', orderTrackingRouter);
app.use('/api/design-upload', designUploadRouter);
app.use('/api/custom-design', customDesignRouter);
app.use('/api/email', emailRouter);
app.use('/api/auth/verification', authVerificationRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai-schema', aiSchemaRouter);
app.use('/api/production-workflow', productionWorkflowRouter);
app.use('/api/chat', chatRouter);
app.use('/api/artist', artistRouter);
app.use('/api/branch-chat', branchChatRouter);
app.use('/api/newsletter', newsletterRouter);

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'build');
  const fs = require('fs');
  
  // Check if build folder exists
  if (!fs.existsSync(buildPath)) {
    console.error('❌ ERROR: build folder not found!');
    console.error('   Make sure to run "npm run build" before starting the server.');
    console.error('   Build path:', buildPath);
  } else {
    console.log('✅ Serving React app from:', buildPath);
    
    // Serve static files (JS, CSS, images, etc.)
    app.use(express.static(buildPath));
    
    // Serve React app for all non-API routes (must be after all API routes)
    app.use((req, res, next) => {
      // Skip API routes - let them fall through to 404 handler
      if (req.path.startsWith('/api/')) {
        return next();
      }
      // Serve React app for all other routes
      const indexPath = path.join(buildPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error('❌ index.html not found in build folder');
        res.status(500).send('React app not built. Please run "npm run build" first.');
      }
    });
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  
  if (res.headersSent) {
    return next(err);
  }
  
  // Ensure CORS headers are set on error responses
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Check for Supabase tenant errors
  if (err.message && (err.message.includes('Tenant') || err.message.includes('tenant'))) {
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please refresh your browser and log in again.'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

const port = process.env.PORT || 4000;

// Start server directly - using Supabase instead of local database
// Listen on 0.0.0.0 to accept connections from mobile devices on local network
app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server listening on http://localhost:${port}`);
  console.log(`📱 Mobile access: http://192.168.254.100:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Using Supabase for database operations');
  
  // Log production build status
  if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'build');
    const fs = require('fs');
    if (fs.existsSync(buildPath)) {
      console.log(`✅ React app build found at: ${buildPath}`);
    } else {
      console.error(`❌ React app build NOT found at: ${buildPath}`);
      console.error('   The build folder is missing. Make sure "npm run build" completed successfully.');
    }
  }
});



