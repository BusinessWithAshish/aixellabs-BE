/* eslint-disable */
/**
 * MongoDB Connection Management Module
 * 
 * This module handles MongoDB database connections with connection pooling,
 * error handling, and automatic reconnection capabilities. It implements
 * the singleton pattern to ensure efficient resource usage across the application.
 * 
 * Key Features:
 * - Connection pooling for performance
 * - Automatic reconnection on failure
 * - Singleton pattern for resource efficiency
 * - TypeScript support with proper typing
 * - Environment-based configuration
 * - Error handling and logging
 */
import { MongoClient, ServerApiVersion, Db } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

/** MongoDB connection URI from environment variables */
const uri = process.env.MONGODB_URI as string;

// Connection pooling variables for singleton pattern
/** Singleton MongoDB client instance */
let client: MongoClient | null = null;
/** Promise for the MongoDB client connection (prevents multiple connection attempts) */
let clientPromise: Promise<MongoClient> | null = null;

/**
 * Establishes and manages MongoDB database connections using the singleton pattern.
 * 
 * This function implements connection pooling and reuse to prevent multiple
 * connections from being created unnecessarily. It handles connection errors
 * gracefully and provides automatic cleanup on failure.
 * 
 * @returns Promise that resolves to the MongoDB client instance
 * 
 * Connection Management:
 * - Reuses existing connections when available
 * - Creates new connections only when necessary
 * - Handles connection failures with automatic cleanup
 * - Uses MongoDB Server API v1 for compatibility
 * 
 * Error Handling:
 * - Logs connection errors for debugging
 * - Resets connection state on failure
 * - Allows retry attempts after failure
 * 
 * Performance Benefits:
 * - Connection pooling reduces overhead
 * - Singleton pattern prevents resource waste
 * - Persistent connections improve response times
 */
export function connectToDatabase(): Promise<MongoClient> {
  // Return existing connection if available
  if (client && clientPromise) {
    return clientPromise;
  }

  // Create a new MongoDB client with Server API configuration
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
    },
  });

  // Initiate connection to the database
  clientPromise = client.connect();

  // Handle connection errors and cleanup
  clientPromise.catch(err => {
    console.error("MongoDB connection error:", err);
    // Reset connection state to allow retry
    client = null;
    clientPromise = null;
  });

  return clientPromise;
}

/**
 * Retrieves a database instance and the MongoDB client for database operations.
 * 
 * This function provides access to a specific database while maintaining the
 * connection through the singleton pattern. It returns both the database
 * instance and the client for flexibility in usage.
 * 
 * @param dbName - Name of the database to connect to
 * @returns Promise resolving to an object containing the database instance and client
 * 
 * Usage Examples:
 * ```typescript
 * // Get database for collections operations
 * const { db, mongoClient } = await getDatabase('aixellabs');
 * const collection = db.collection('businesses');
 * 
 * // Perform database operations
 * await collection.insertOne(document);
 * ```
 * 
 * Return Object:
 * - `db`: MongoDB database instance for collection operations
 * - `mongoClient`: MongoDB client instance for advanced operations
 * 
 * Features:
 * - Reuses existing connections through connectToDatabase()
 * - Provides both database and client access
 * - Maintains connection pooling benefits
 * - Supports multiple database access patterns
 */
export async function getDatabase(dbName: string): Promise<{ db: Db, mongoClient: MongoClient }> {
  const mongoClient = await connectToDatabase();
  const db = mongoClient.db(dbName)
  return { db , mongoClient };
}