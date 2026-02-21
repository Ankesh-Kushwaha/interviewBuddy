import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import mongoose from 'mongoose';
import redis from './config/redisConfig.js';
import { startQueueConsumer } from './utils/codeexecutionEngine.js';

(async () => {
  await redis.connect();

  mongoose
    .connect(process.env.DATABASE_URL)
    .then(() => console.log("Worker connected to Mongo"))
    .catch((err) => console.error("Worker Mongo error:", err));

  console.log("Worker listening to Redis queue…");
  startQueueConsumer();
})();
