import { z } from 'zod';
import { pool, withTransaction } from '../db/pool.js';
import { bumpStreak } from '../lib/streak.js';
import { HttpError } from '../middleware/errorHandler.js';

function stripAnswerKey(question) {
    const { correct_option_index, options, ...rest } = question;
    return {
        ...rest,
        options: (options || []).map(({ is_correct, ...opt }) => opt),
    };
}

// The core integrity fix: the browser genuinely cannot see which option is correct while
// the quiz is in progress — unlike the old client-side flow, which fetched the same full
// Question.list() used for studying (answer key included) and graded itself.
export async function getQuizQuestions(req, res, next) {
    try {
        const { topic_id, difficulty, count } = req.query;
        const limit = Math.min(Math.max(Number(count) || 10, 1), 50);

        const clauses = [`status = 'published'`, 'is_visible = true', `type = 'mcq'`, 'jsonb_array_length(options) >= 2'];
        const values = [];
        if (topic_id && topic_id !== 'all') {
            values.push(topic_id);
            clauses.push(`topic_id = $${values.length}`);
        }
        if (difficulty && difficulty !== 'all') {
            values.push(difficulty);
            clauses.push(`difficulty = $${values.length}`);
        }

        const { rows } = await pool.query(
            `SELECT * FROM questions WHERE ${clauses.join(' AND ')} ORDER BY random() LIMIT ${limit}`,
            values
        );
        res.json(rows.map(stripAnswerKey));
    } catch (err) {
        next(err);
    }
}

// Reveals one question's correct answer at a time — used for the immediate per-question
// feedback the quiz UI shows right after the user picks an option. Deliberately NOT a bulk
// endpoint: a client can only learn the answer to a question it is actively answering,
// never the whole set up front the way the old client-side flow did.
export async function revealAnswer(req, res, next) {
    try {
        const { rows } = await pool.query(
            `SELECT correct_option_index FROM questions
             WHERE id = $1 AND status = 'published' AND is_visible = true AND type = 'mcq'`,
            [req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Question not found' });
        res.json({ correct_option_index: rows[0].correct_option_index });
    } catch (err) {
        next(err);
    }
}

const submitSchema = z.object({
    topic_id: z.string().nullable().optional(),
    difficulty: z.string().default('all'),
    time_taken: z.number().int().min(0).max(24 * 60 * 60),
    answers: z
        .array(
            z.object({
                question_id: z.string(),
                selected_option_index: z.number().int().min(0),
            })
        )
        .min(1),
});

export async function submitQuiz(req, res, next) {
    try {
        const parsed = submitSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
        const { topic_id, difficulty, time_taken, answers } = parsed.data;

        const questionIds = answers.map((a) => a.question_id);
        const { rows: questions } = await pool.query(
            `SELECT id, correct_option_index, options, title FROM questions WHERE id = ANY($1::uuid[])`,
            [questionIds]
        );
        const byId = new Map(questions.map((q) => [q.id, q]));

        let topicName = 'Mixed';
        if (topic_id) {
            const { rows: topicRows } = await pool.query('SELECT name FROM topics WHERE id = $1', [topic_id]);
            topicName = topicRows[0]?.name || '';
        }

        const gradedAnswers = answers.map((a) => {
            const question = byId.get(a.question_id);
            const isCorrect = Boolean(question) && a.selected_option_index === question.correct_option_index;
            return { question_id: a.question_id, selected_answer: a.selected_option_index, is_correct: isCorrect };
        });

        const correctCount = gradedAnswers.filter((a) => a.is_correct).length;
        const total = gradedAnswers.length;
        const scorePercentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

        const attempt = await withTransaction(async (client) => {
            const { rows } = await client.query(
                `INSERT INTO quiz_attempts
                    (user_id, topic_id, topic_name, difficulty, total_questions, correct_answers, wrong_answers, score_percentage, time_taken, answers)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 RETURNING *`,
                [
                    req.user.id,
                    topic_id || null,
                    topicName,
                    difficulty,
                    total,
                    correctCount,
                    total - correctCount,
                    scorePercentage,
                    time_taken,
                    JSON.stringify(gradedAnswers),
                ]
            );
            await bumpStreak(client, req.user.id);
            return rows[0];
        });

        // Safe to reveal the answer key now — the attempt is already graded and recorded.
        const review = questionIds.map((id) => {
            const q = byId.get(id);
            return q ? { question_id: id, correct_option_index: q.correct_option_index, title: q.title } : null;
        }).filter(Boolean);

        res.status(201).json({ attempt, review });
    } catch (err) {
        next(err);
    }
}

export async function getAllQuizAttemptsForAdmin(req, res, next) {
    try {
        const { rows } = await pool.query('SELECT * FROM quiz_attempts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        next(err);
    }
}

export async function getQuizHistory(req, res, next) {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM quiz_attempts WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
}
