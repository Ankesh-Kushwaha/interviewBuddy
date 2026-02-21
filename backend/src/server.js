import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import submissionRoute from './routes/handleSubmissionRoute.js';
import redis from './config/redisConfig.js';
import { environment } from './utils/env.js';
import problemRoute from './routes/problemsRoutes.js'
import testCaseRoute from './routes/TestCaseRoutes.js'
import userRoutes from './routes/userRoutes.js'
import handleSubmissionRoute from './routes/handleSubmissionRoute.js'
import handleLanguageRoute from './routes/LanguageHandler.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  return res.status(200).json("server is healthy");
});

(async () => {
  await redis.connect();

  mongoose
    .connect(environment.DB_URL)
    .then(() => console.log("mongo connection successful"))
    .catch((err) => console.error("Mongo error:", err));
})();


app.use('/api/user', userRoutes);
app.use('/api/submission', submissionRoute);
app.use('/api/problems', problemRoute);
app.use('/api/testcase', testCaseRoute);
app.use('/api/submission', handleSubmissionRoute);
app.use('/api/language', handleLanguageRoute);

app.listen(PORT, () => {
  console.log(`server is listening on port:${PORT}`);
});
