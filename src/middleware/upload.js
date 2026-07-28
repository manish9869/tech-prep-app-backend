import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadImage = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    },
}).single('file');

const RESUME_MIME_TYPES = new Set([
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

export const uploadResume = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (!RESUME_MIME_TYPES.has(file.mimetype)) {
            return cb(new Error('Only .pdf, .docx, or .txt files are allowed'));
        }
        cb(null, true);
    },
}).single('file');
