import dotenv from 'dotenv'
dotenv.config();
import http from "http";
import express from "express";
import cors from 'cors'
import redis from "../config/redisConfig.js";
import { startWebSocketServer } from "./wsserver.js";
import { startResultConsumer } from "./redisConsumer.js";
const PORT = process.env.PORT || 3002;
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

server.listen(PORT, async () => {
  try {
    await redis.connect();
    console.log('redis connected successfully');
    console.log(`🚀 WS Service running on port ${PORT}`);
    startWebSocketServer(server);
    startResultConsumer();
  }
  catch (err) {
    console.error("error while starting consumer service",err.message);
  }
});
