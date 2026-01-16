import dotenv from "dotenv";
dotenv.config({ path: ".env" }); // or correct path

import { environment } from './utils/env.js';
import mongoose from 'mongoose';
import redis from './config/redisConfig.js';
import { startQueueConsumer } from './utils/codeexecutionEngine.js';

console.log("DB_URL:", environment.DB_URL);

(async () => {
  await redis.connect();

  mongoose
    .connect("mongodb+srv://ankeshkush9651_db_user:TalentIq123@cluster0.uuuejzq.mongodb.net/")
    .then(() => console.log("Worker connected to Mongo"))
    .catch((err) => console.error("Worker Mongo error:", err));

  console.log("Worker listening to Redis queue…");
  startQueueConsumer();
})();
