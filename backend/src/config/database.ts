import mongoose from 'mongoose';

/**
 * MongoDB connection with production-ready pooling configuration
 * Fixes Critical Issue C1: No Database Connection Pooling
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/caro-game';

    // Log which database is being used (without exposing credentials)
    if (process.env.MONGODB_URI) {
      const uriWithoutCredentials = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      console.log(`[Database] Connecting to MongoDB Atlas: ${uriWithoutCredentials}`);
    } else {
      console.warn('[Database] ⚠️  WARNING: MONGODB_URI not set! Using fallback localhost database.');
      console.warn('[Database] ⚠️  This means local and deploy are using DIFFERENT databases!');
      console.log(`[Database] Connecting to fallback: ${mongoUri}`);
    }

    await mongoose.connect(mongoUri, {
      // Connection pool settings for production scale
      maxPoolSize: 100,           // Max 100 connections for HTTP requests
      minPoolSize: 10,            // Always keep 10 connections warm
      maxIdleTimeMS: 30000,       // Close idle connections after 30s
      serverSelectionTimeoutMS: 5000,  // Fail fast on server issues
      socketTimeoutMS: 45000,     // Socket timeout for long operations
      family: 4,                  // Use IPv4 first (faster)

      // Write concern for data safety
      writeConcern: {
        w: 'majority',
        wtimeout: 10000,
      },

      // Read preference for replicated deployments
      readPreference: 'primaryPreferred',
    });

    // Log connection success with database name
    const dbName = mongoose.connection.db?.databaseName || 'unknown';
    console.log(`[Database] ✅ MongoDB connected successfully to database: "${dbName}"`);
    console.log(`[Database] Connection pool: max=${100}, min=${10}`);

    // Monitor connection pool events in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.connection.on('connected', () => {
        console.log('Mongoose connected to MongoDB');
      });

      mongoose.connection.on('error', (err) => {
        console.error('Mongoose connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('Mongoose disconnected from MongoDB');
      });
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

