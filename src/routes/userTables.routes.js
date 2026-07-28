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

const router = Router();

registerOwnedTable(router, '/bookmarks', 'bookmarks');
registerOwnedTable(router, '/notes', 'notes');
registerOwnedTable(router, '/progress', 'progress', { onCreate: createProgress });
registerOwnedTable(router, '/resume-analyses', 'resume_analyses');

export default router;
