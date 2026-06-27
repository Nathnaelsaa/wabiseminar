import knex from "knex";
import dotenv from "dotenv";

dotenv.config();

let dbInstance = null;

export async function initializeDbConnection() {
  const isMySQLConfigured = !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);

  if (isMySQLConfigured) {
    console.log("MySQL is configured. Verifying database connection...");
    const connectionSettings = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || "3306", 10),
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    };

    const mysqlDb = knex({
      client: "mysql2",
      connection: connectionSettings,
      pool: { min: 0, max: 10 }
    });

    try {
      // Test the database connection with a fast query
      await mysqlDb.raw("SELECT 1 as test");
      console.log("Successfully connected to MySQL database!");
      dbInstance = mysqlDb;
      return dbInstance;
    } catch (err) {
      console.error(`MySQL connection failed (Error: ${err.message}). Falling back to local SQLite database...`);
      try {
        await mysqlDb.destroy();
      } catch (e) {
        // Ignore
      }
    }
  }

  // Fallback to SQLite
  console.log("Initializing local SQLite database (wabiseminar.sqlite)...");
  dbInstance = knex({
    client: "better-sqlite3",
    connection: {
      filename: "./wabiseminar.sqlite",
    },
    useNullAsDefault: true,
  });
  return dbInstance;
}

// Proxy/getter to access the active database connection instance
export const db = new Proxy(() => {}, {
  get(target, prop) {
    if (!dbInstance) {
      throw new Error("Database has not been initialized. Call initializeDbConnection() first.");
    }
    const val = dbInstance[prop];
    if (typeof val === "function") {
      return val.bind(dbInstance);
    }
    return val;
  },
  apply(target, thisArg, argumentsList) {
    if (!dbInstance) {
      throw new Error("Database has not been initialized. Call initializeDbConnection() first.");
    }
    return dbInstance(...argumentsList);
  }
});

export default db;
