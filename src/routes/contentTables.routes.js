import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { makeTableController } from '../lib/genericTable.js';

// Read-mostly reference content: any authenticated viewer can read, only admins can write.
// (Public/anonymous reads aren't needed today — every page in the app sits behind login.)
function registerReadWriteTable(router, path, table, options = {}) {
    const controller = makeTableController({ table, ...options });
    router.get(path, authenticate, controller.list);
    router.get(`${path}/:id`, authenticate, controller.getOne);
    router.post(path, authenticate, requireAdmin, controller.create);
    router.patch(`${path}/:id`, authenticate, requireAdmin, controller.update);
    router.delete(`${path}/:id`, authenticate, requireAdmin, controller.remove);
}

/**
 * @openapi
 * /topics:
 *   get:
 *     tags: [Content]
 *     summary: List topics
 *     description: Any real `topics` column may be passed as an equality filter (e.g. `?is_visible=true`).
 *     parameters:
 *       - in: query
 *         name: is_visible
 *         schema: { type: boolean }
 *       - in: query
 *         name: ascending
 *         schema: { type: boolean, default: false }
 *         description: Sort by `sort_order` ascending instead of the default descending order.
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Topic' } } } } }
 *   post:
 *     tags: [Content]
 *     summary: Create a topic (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Topic' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Topic' } } } }
 *       400: { description: No valid fields provided, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 * /topics/{id}:
 *   get:
 *     tags: [Content]
 *     summary: Get one topic
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Topic' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     tags: [Content]
 *     summary: Update a topic (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Topic' }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Topic' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     tags: [Content]
 *     summary: Delete a topic (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @openapi
 * /questions:
 *   get:
 *     tags: [Content]
 *     summary: List questions
 *     description: >
 *       Any real `questions` column may be passed as an equality filter — commonly `topic_id`,
 *       `difficulty`, `type`, `status`, `is_visible`, `round`. Note this route includes the
 *       answer key (`answer`, `correct_option_index`); it is only reachable by authenticated
 *       users and is not used for the integrity-sensitive quiz flow (see `/quiz/questions`).
 *     parameters:
 *       - in: query
 *         name: topic_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: difficulty
 *         schema: { type: string, enum: [basic, medium, experienced] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [theory, coding, mcq, scenario, interview] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published] }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Question' } } } } }
 *   post:
 *     tags: [Content]
 *     summary: Create a question (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Question' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Question' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 * /questions/{id}:
 *   get:
 *     tags: [Content]
 *     summary: Get one question
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Question' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     tags: [Content]
 *     summary: Update a question (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Question' }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Question' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     tags: [Content]
 *     summary: Delete a question (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @openapi
 * /companies:
 *   get:
 *     tags: [Content]
 *     summary: List companies (used for company-tag filtering across questions)
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Company' } } } } }
 *   post:
 *     tags: [Content]
 *     summary: Create a company (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Company' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Company' } } } }
 * /companies/{id}:
 *   get:
 *     tags: [Content]
 *     summary: Get one company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Company' } } } }
 *   patch:
 *     tags: [Content]
 *     summary: Update a company (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Company' }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Company' } } } }
 *   delete:
 *     tags: [Content]
 *     summary: Delete a company (admin only)
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
 * /roadmap-topics:
 *   get:
 *     tags: [Content]
 *     summary: List roadmap phases (used by the Roadmap page's two-column skill tree)
 *     parameters:
 *       - in: query
 *         name: topic_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/RoadmapTopic' } } } } }
 *   post:
 *     tags: [Content]
 *     summary: Create a roadmap phase (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RoadmapTopic' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/RoadmapTopic' } } } }
 * /roadmap-topics/{id}:
 *   get:
 *     tags: [Content]
 *     summary: Get one roadmap phase
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/RoadmapTopic' } } } }
 *   patch:
 *     tags: [Content]
 *     summary: Update a roadmap phase (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RoadmapTopic' }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/RoadmapTopic' } } } }
 *   delete:
 *     tags: [Content]
 *     summary: Delete a roadmap phase (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } } }
 */
const router = Router();

registerReadWriteTable(router, '/topics', 'topics');
registerReadWriteTable(router, '/questions', 'questions');
registerReadWriteTable(router, '/companies', 'companies');
registerReadWriteTable(router, '/roadmap-topics', 'roadmap_topics');

/**
 * @openapi
 * /page-visibility:
 *   get:
 *     tags: [Content]
 *     summary: List page-visibility toggles
 *     description: One pre-seeded row per app route; drives which sidebar links a viewer sees.
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/PageVisibility' } } } } }
 * /page-visibility/{id}:
 *   patch:
 *     tags: [Content]
 *     summary: Toggle a page's visibility (admin only)
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
 *               is_visible: { type: boolean }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/PageVisibility' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
// page_visibility rows are pre-seeded (one per app route) — only list + toggle are exposed,
// matching what PageVisibilityManager.jsx actually does today.
const pageVisibility = makeTableController({ table: 'page_visibility' });
router.get('/page-visibility', authenticate, pageVisibility.list);
router.patch('/page-visibility/:id', authenticate, requireAdmin, pageVisibility.update);

export default router;
