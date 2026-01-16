import express from 'express';
const router = express.Router();
import codeSubmission from '../controllers/handleSubmission.js';

router.post('/submission', codeSubmission);
export default router;