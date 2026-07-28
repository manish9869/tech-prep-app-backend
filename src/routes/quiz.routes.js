import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import * as quizController from '../controllers/quiz.controller.js';

const router = Router();

router.get('/questions', authenticate, quizController.getQuizQuestions);
router.get('/questions/:id/answer', authenticate, quizController.revealAnswer);
router.post('/submit', authenticate, quizController.submitQuiz);
router.get('/history', authenticate, quizController.getQuizHistory);
router.get('/admin/all', authenticate, requireAdmin, quizController.getAllQuizAttemptsForAdmin);

export default router;
