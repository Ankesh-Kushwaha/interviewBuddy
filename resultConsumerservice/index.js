import http from "http";
import express from "express";

import { startWebSocketServer } from "./wsserver.js";
import { startResultConsumer } from "./redisConsumer.js";

const app = express();
const server = http.createServer(app);

startWebSocketServer(server);
startResultConsumer();

server.listen(4000, () => {
  console.log("🚀 WS Service running on port 4000");
});
