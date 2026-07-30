import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import * as quizController from '../controllers/quiz.controller.js';

const router = Router();

/**
 * @openapi
 * /quiz/questions:
 *   get:
 *     tags: [Quiz]
 *     summary: Get a random batch of MCQ questions for a quiz attempt
 *     description: >
 *       Server-graded flow — the answer key (`correct_option_index`, and `is_correct` on each
 *       option) is stripped before the response leaves the server, so the browser genuinely
 *       cannot see the correct answer while the quiz is in progress.
 *     parameters:
 *       - in: query
 *         name: topic_id
 *         schema: { type: string }
 *         description: Topic UUID, or `all` for every topic.
 *       - in: query
 *         name: difficulty
 *         schema: { type: string }
 *         description: '`basic` | `medium` | `experienced` | `all`'
 *       - in: query
 *         name: count
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200:
 *         description: Questions with answer key stripped
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Question' } }
 */
router.get('/questions', authenticate, quizController.getQuizQuestions);

/**
 * @openapi
 * /quiz/questions/{id}/answer:
 *   get:
 *     tags: [Quiz]
 *     summary: Reveal the correct answer for one in-progress question
 *     description: Deliberately per-question, not bulk — a client can only learn the answer to the question it is actively answering.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { correct_option_index: { type: integer } } }
 *       404: { description: Question not found (or not a published MCQ), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.get('/questions/:id/answer', authenticate, quizController.revealAnswer);

/**
 * @openapi
 * /quiz/submit:
 *   post:
 *     tags: [Quiz]
 *     summary: Submit and server-grade a completed quiz attempt
 *     description: Grades every answer against the real answer key, persists a `quiz_attempts` row, and bumps the user's study streak.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [time_taken, answers]
 *             properties:
 *               topic_id: { type: string, format: uuid, nullable: true }
 *               difficulty: { type: string, default: all }
 *               time_taken: { type: integer, description: Seconds }
 *               answers:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [question_id, selected_option_index]
 *                   properties:
 *                     question_id: { type: string, format: uuid }
 *                     selected_option_index: { type: integer, minimum: 0 }
 *     responses:
 *       201:
 *         description: Graded attempt + per-question review (answer key, now safe to reveal)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempt: { $ref: '#/components/schemas/QuizAttempt' }
 *                 review:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       question_id: { type: string, format: uuid }
 *                       correct_option_index: { type: integer }
 *                       title: { type: string }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/submit', authenticate, quizController.submitQuiz);

/**
 * @openapi
 * /quiz/history:
 *   get:
 *     tags: [Quiz]
 *     summary: List the caller's own past quiz attempts
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/QuizAttempt' } } } } }
 */
router.get('/history', authenticate, quizController.getQuizHistory);

/**
 * @openapi
 * /quiz/admin/all:
 *   get:
 *     tags: [Quiz]
 *     summary: List every user's quiz attempts (admin only)
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/QuizAttempt' } } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.get('/admin/all', authenticate, requireAdmin, quizController.getAllQuizAttemptsForAdmin);

export default router;
