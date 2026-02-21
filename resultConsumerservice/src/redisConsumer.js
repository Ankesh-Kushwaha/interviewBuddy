import redis from '../config/redisConfig.js';
import { connectionManager } from './connectionStore.js';

export async function startResultConsumer() {
  console.log("📡 Redis result consumer started...");

  while (true) {
    try {
      const { element } = await redis.blPop("result_queue", 0);
      const result = JSON.parse(element);

      connectionManager.sendToUser(result.userId.toString(), {
        type: "SUBMISSION_RESULT",
        payload: result
      });

      console.log(
        `📨 Result delivered → user=${result.userId}, submission=${result.submissionId}`
      );
    } catch (err) {
      console.error("❌ Result consumer error:", err);
    }
  }
}
