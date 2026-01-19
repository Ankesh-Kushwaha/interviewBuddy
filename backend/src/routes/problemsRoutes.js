import express from 'express';
const router = express.Router();
import { createProblem, getAllProblem, getASingleProblem } from '../controllers/problemsController.js';

router.post('/create', createProblem);
router.get('/get/:problemId', getASingleProblem);
router.get('/get-all', getAllProblem);

export default router;