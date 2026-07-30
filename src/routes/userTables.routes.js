import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { makeTableController } from '../lib/genericTable.js';
import { createProgress } from '../controllers/progress.controller.js';

// Bookmarks/notes/progress are always scoped to the caller: `user_id` is forced from the
// verified JWT (ownerColumn), never trusted from the request body, and every read/update/
// delete is additionally filtered by it — one user can never touch another's rows.
function registerOwnedTable(router, path, table, { onCreate } = {}) {
    const controller = makeTableController({ table, ownerColumn: 'user_id' });
    router.get(path, authenticate, controller.list);
    router.get(`${path}/:id`, authenticate, controller.getOne);
    router.post(path, authenticate, onCreate || controller.create);
    router.patch(`${path}/:id`, authenticate, controller.update);
    router.delete(`${path}/:id`, authenticate, controller.remove);
}

/**
 * @openapi
 * /bookmarks:
 *   get:
 *     tags: [User Data]
 *     summary: List the caller's bookmarks
 *     description: Always scoped to the authenticated user server-side — `user_id` cannot be set or overridden by the caller.
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Bookmark' } } } } }
 *   post:
 *     tags: [User Data]
 *     summary: Bookmark a question
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question_id]
 *             properties:
 *               question_id: { type: string, format: uuid }
 *               question_title: { type: string }
 *               topic_name: { type: string }
 *               difficulty: { type: string }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Bookmark' } } } }
 * /bookmarks/{id}:
 *   get:
 *     tags: [User Data]
 *     summary: Get one bookmark (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Bookmark' } } } }
 *       404: { description: Not found (or belongs to another user), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     tags: [User Data]
 *     summary: Update a bookmark (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Bookmark' }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Bookmark' } } } }
 *   delete:
 *     tags: [User Data]
 *     summary: Remove a bookmark (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } } }
 */

/**
 * @openapi
 * /notes:
 *   get:
 *     tags: [User Data]
 *     summary: List the caller's notes
 *     parameters:
 *       - in: query
 *         name: question_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Note' } } } } }
 *   post:
 *     tags: [User Data]
 *     summary: Create a note on a question
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question_id, content]
 *             properties:
 *               question_id: { type: string, format: uuid }
 *               content: { type: string }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Note' } } } }
 * /notes/{id}:
 *   get:
 *     tags: [User Data]
 *     summary: Get one note (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Note' } } } }
 *   patch:
 *     tags: [User Data]
 *     summary: Edit a note (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Note' } } } }
 *   delete:
 *     tags: [User Data]
 *     summary: Delete a note (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } } }
 */

/**
 * @openapi
 * /progress:
 *   get:
 *     tags: [User Data]
 *     summary: List the caller's completed-question records
 *     parameters:
 *       - in: query
 *         name: topic_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Progress' } } } } }
 *   post:
 *     tags: [User Data]
 *     summary: Mark a question as completed
 *     description: Custom create handler (`createProgress`) — typically upserts rather than allowing duplicate completion records for the same question.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question_id, topic_id]
 *             properties:
 *               question_id: { type: string, format: uuid }
 *               topic_id: { type: string, format: uuid }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Progress' } } } }
 * /progress/{id}:
 *   get:
 *     tags: [User Data]
 *     summary: Get one progress record (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Progress' } } } }
 *   patch:
 *     tags: [User Data]
 *     summary: Update a progress record (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Progress' }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Progress' } } } }
 *   delete:
 *     tags: [User Data]
 *     summary: Delete a progress record (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } } }
 */

/**
 * @openapi
 * /resume-analyses:
 *   get:
 *     tags: [User Data]
 *     summary: List the caller's saved resume analyses
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/ResumeAnalysis' } } } } }
 *   post:
 *     tags: [User Data]
 *     summary: Save a resume analysis result
 *     description: Typically created after `/uploads/resume` + `/llm/complete` produce the analysis client-side; this just persists it.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResumeAnalysis' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/ResumeAnalysis' } } } }
 * /resume-analyses/{id}:
 *   get:
 *     tags: [User Data]
 *     summary: Get one resume analysis (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/ResumeAnalysis' } } } }
 *   patch:
 *     tags: [User Data]
 *     summary: Update a resume analysis (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResumeAnalysis' }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/ResumeAnalysis' } } } }
 *   delete:
 *     tags: [User Data]
 *     summary: Delete a resume analysis (must belong to the caller)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } } }
 */
const router = Router();

registerOwnedTable(router, '/bookmarks', 'bookmarks');
registerOwnedTable(router, '/notes', 'notes');
registerOwnedTable(router, '/progress', 'progress', { onCreate: createProgress });
registerOwnedTable(router, '/resume-analyses', 'resume_analyses');

export default router;
