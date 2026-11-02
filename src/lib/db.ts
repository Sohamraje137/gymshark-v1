import mongoose from "mongoose";

// Reuse one connection across hot reloads in dev and across requests in prod.
const globalForMongoose = globalThis as unknown as {
  mongoosePromise?: Promise<typeof mongoose>;
};

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  globalForMongoose.mongoosePromise ??= mongoose.connect(uri).catch((err) => {
    globalForMongoose.mongoosePromise = undefined; // allow a retry on the next request
    throw err;
  });
  return globalForMongoose.mongoosePromise;
}
