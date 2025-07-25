import mongoose from 'mongoose';
import { DB_CONFIG } from './constants';

/**
 * Logger utility that conditionally logs based on environment
 */
const logger = {
  info: (message: string, ...args: any[]) => {
    // Only log in development or when DEBUG env var is set
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log(message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors, but with different verbosity
    if (process.env.NODE_ENV === 'production') {
      // In production, log minimal information to avoid exposing sensitive data
      console.error(message);
    } else {
      // In development, log full details
      console.error(message, ...args);
    }
  }
};

/**
 * Ensures the MongoDB URI has properly encoded special characters
 * This is a safeguard against connection issues caused by unencoded special characters
 * @param uri The original MongoDB URI
 * @returns A properly encoded MongoDB URI
 */
function ensureEncodedMongoUri(uri: string): string {
  if (!uri) return uri;
  
  try {
    // Parse the URI to extract components
    const matches = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (!matches) return uri; // Not a standard MongoDB URI format
    
    const [, protocol, username, password, rest] = matches;
    
    // Only re-encode the password part
    const encodedPassword = encodeURIComponent(decodeURIComponent(password));
    
    return `${protocol}${username}:${encodedPassword}@${rest}`;
  } catch (error) {
    logger.error('Error encoding MongoDB URI:', error);
    return uri; // Return original if encoding fails
  }
}

// Get and encode the MongoDB URI
const rawMongoUri = process.env.MONGODB_URI;
const MONGODB_URI = rawMongoUri ? ensureEncodedMongoUri(rawMongoUri) : undefined;

// Conditional diagnostic logging
logger.info('Environment check: NODE_ENV =', process.env.NODE_ENV);
logger.info('MongoDB URI check:', MONGODB_URI ? 'Defined' : 'Undefined');

if (!MONGODB_URI) {
  logger.error('MONGODB_URI is not defined in environment variables');
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Log a sanitized version of the connection string for debugging
// This masks the password but shows the structure
try {
  const sanitizedUri = MONGODB_URI.replace(
    /(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/,
    (_, prefix, password, suffix) => `${prefix}********${suffix}`
  );
  logger.info('Sanitized MongoDB URI:', sanitizedUri);
  logger.info('URI encoding check: Password contains encoded characters:',
    MONGODB_URI.includes('%') ? 'Yes' : 'No');
} catch (error) {
  logger.error('Error parsing MongoDB URI:', error);
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: DB_CONFIG.bufferCommands,
      maxPoolSize: DB_CONFIG.maxConnections,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    logger.info('Attempting MongoDB connection with options:', JSON.stringify({
      bufferCommands: opts.bufferCommands,
      maxPoolSize: opts.maxPoolSize,
      serverSelectionTimeoutMS: opts.serverSelectionTimeoutMS,
      socketTimeoutMS: opts.socketTimeoutMS,
      family: opts.family
    }));
    
    cached!.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      logger.info('Connected to MongoDB successfully');
      return mongoose;
    }).catch((error) => {
      logger.error('MongoDB connection error:', error.message);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Error details:', {
          code: error.code,
          name: error.name
        });
        
        if (error.message && error.message.includes('@')) {
          logger.error('Connection string may contain unencoded special characters');
        }
      }
      
      cached!.promise = null;
      throw error;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default dbConnect;