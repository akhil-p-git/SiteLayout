import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';

import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import exclusionZoneRoutes from './routes/exclusionZone';
import constraintRoutes from './routes/constraint';
import exportRoutes from './routes/export';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
// Configure helmet with relaxed settings for development (no SSL)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      upgradeInsecureRequests: null, // Disable upgrade-insecure-requests for HTTP
    },
  },
  hsts: false, // Disable HSTS since we're using HTTP
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'site-layouts-api',
  });
});

// API version endpoint
app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'MVP+ Site Layouts API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes); // Also mount at v1 for consistency

// Upload routes
app.use('/api/v1/upload', uploadRoutes);

// Exclusion zone routes
app.use('/api/v1/exclusion-zones', exclusionZoneRoutes);

// Constraint routes
app.use('/api/v1/constraints', constraintRoutes);

// Export routes
app.use('/api/v1/export', exportRoutes);

// Placeholder routes (to be implemented)
app.use('/api/v1/projects', (_req, res) => {
  res.json({ message: 'Projects API - Coming soon' });
});

app.use('/api/v1/sites', (_req, res) => {
  res.json({ message: 'Sites API - Coming soon' });
});

app.use('/api/v1/layouts', (_req, res) => {
  res.json({ message: 'Layouts API - Coming soon' });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: crypto.randomUUID(),
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Site Layouts API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});

export default app;
