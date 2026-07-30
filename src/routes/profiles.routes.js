import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import * as profilesController from '../controllers/profiles.controller.js';

const router = Router();

/**
 * @openapi
 * /profiles/me:
 *   get:
 *     tags: [Profiles]
 *     summary: Get the logged-in user's profile
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Profile' } } } }
 *       401: { description: Missing/invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Profile not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.get('/me', authenticate, profilesController.me);

/**
 * @openapi
 * /profiles/me:
 *   patch:
 *     tags: [Profiles]
 *     summary: Update the logged-in user's own profile
 *     description: Only `full_name` is updatable here — role, email, id, and streak fields are server-owned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name: { type: string, maxLength: 120 }
 *     responses:
 *       200: { description: Updated profile, content: { application/json: { schema: { $ref: '#/components/schemas/Profile' } } } }
 *       400: { description: No updatable fields provided, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch('/me', authenticate, profilesController.updateMe);

/**
 * @openapi
 * /profiles:
 *   get:
 *     tags: [Profiles]
 *     summary: List all users (admin only)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Profile' } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.get('/', authenticate, requireAdmin, profilesController.listUsers);

/**
 * @openapi
 * /profiles/{id}/role:
 *   patch:
 *     tags: [Profiles]
 *     summary: Promote or demote a user (admin only)
 *     description: An admin cannot demote themselves via this endpoint.
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [user, admin] }
 *     responses:
 *       200: { description: Updated profile, content: { application/json: { schema: { $ref: '#/components/schemas/Profile' } } } }
 *       400: { description: Invalid role or self-demotion attempt, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: User not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch('/:id/role', authenticate, requireAdmin, profilesController.updateUserRole);

export default router;
