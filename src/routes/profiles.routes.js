import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import * as profilesController from '../controllers/profiles.controller.js';

const router = Router();

router.get('/me', authenticate, profilesController.me);
router.patch('/me', authenticate, profilesController.updateMe);

router.get('/', authenticate, requireAdmin, profilesController.listUsers);
router.patch('/:id/role', authenticate, requireAdmin, profilesController.updateUserRole);

export default router;
