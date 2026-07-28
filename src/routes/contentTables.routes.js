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

const router = Router();

registerReadWriteTable(router, '/topics', 'topics');
registerReadWriteTable(router, '/questions', 'questions');
registerReadWriteTable(router, '/companies', 'companies');
registerReadWriteTable(router, '/roadmap-topics', 'roadmap_topics');

// page_visibility rows are pre-seeded (one per app route) — only list + toggle are exposed,
// matching what PageVisibilityManager.jsx actually does today.
const pageVisibility = makeTableController({ table: 'page_visibility' });
router.get('/page-visibility', authenticate, pageVisibility.list);
router.patch('/page-visibility/:id', authenticate, requireAdmin, pageVisibility.update);

export default router;
