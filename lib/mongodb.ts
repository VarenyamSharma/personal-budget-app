import { MongoClient } from 'mongodb';

/**
 * Logger utility that conditionally logs based on environment
 */
const logger = {
  info: (message: string, ...args: any[]) => {
    // Only log in development or when DEBUG env var is set
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log(`🔍 mongodb.ts: ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors, but with different verbosity
    if (process.env.NODE_ENV === 'production') {
      // In production, log minimal information to avoid exposing sensitive data
      console.error(`mongodb.ts: ${message}`);
    } else {
      // In development, log full details
      console.error(`❌ mongodb.ts: ${message}`, ...args);
    }
  }
};

logger.info('Initializing MongoDB client');
logger.info('NODE_ENV =', process.env.NODE_ENV);

if (!process.env.MONGODB_URI) {
  logger.error('MONGODB_URI environment variable is missing');
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

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
const uri = rawMongoUri ? ensureEncodedMongoUri(rawMongoUri) : rawMongoUri;

// Log a sanitized version of the URI for debugging
try {
  const sanitizedUri = uri.replace(
    /(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/,
    (_, prefix, password, suffix) => `${prefix}********${suffix}`
  );
  logger.info('Using MongoDB URI:', sanitizedUri);
  logger.info('URI encoding check: Password contains encoded characters:',
    uri.includes('%') ? 'Yes' : 'No');
} catch (error) {
  logger.error('Error parsing MongoDB URI:', error);
}

const options = {};
logger.info('MongoDB client options initialized');

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    logger.info('Creating new MongoDB client (development mode)');
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect()
      .then(client => {
        logger.info('MongoDB client connected successfully (development mode)');
        return client;
      })
      .catch(error => {
        logger.error('MongoDB connection error (development mode):', error.message);
        
        if (process.env.NODE_ENV !== 'production') {
          logger.error('Error details:', {
            code: error.code,
            name: error.name
          });
          
          if (error.message && error.message.includes('@')) {
            logger.error('Connection string may contain unencoded special characters');
          }
        }
        
        throw error;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  logger.info('Creating new MongoDB client (production mode)');
  client = new MongoClient(uri, options);
  clientPromise = client.connect()
    .then(client => {
      logger.info('MongoDB client connected successfully (production mode)');
      return client;
    })
    .catch(error => {
      logger.error('MongoDB connection error (production mode):', error.message);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Error details:', {
          code: error.code,
          name: error.name
        });
        
        if (error.message && error.message.includes('@')) {
          logger.error('Connection string may contain unencoded special characters');
        }
      }
      
      throw error;
    });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;