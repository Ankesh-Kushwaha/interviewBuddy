import express from 'express';
const router = express.Router();
import {codeSubmission} from '../controllers/handleSubmission.js';

router.post('/', codeSubmission);
export default router;