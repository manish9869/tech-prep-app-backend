import { uploadBuffer } from '../lib/storage.js';
import { extractTextFromBuffer } from '../lib/extractText.js';
import { HttpError } from '../middleware/errorHandler.js';

const EXT_BY_MIME = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export async function uploadTopicLogo(req, res, next) {
    try {
        if (!req.file) throw new HttpError(400, 'No file provided');
        const ext = EXT_BY_MIME[req.file.mimetype] || 'bin';
        const { url } = await uploadBuffer({
            buffer: req.file.buffer,
            contentType: req.file.mimetype,
            folder: 'topics',
            ext,
        });
        res.json({ file_url: url });
    } catch (err) {
        next(err);
    }
}

export async function uploadResume(req, res, next) {
    try {
        if (!req.file) throw new HttpError(400, 'No file provided');

        const [text, { url }] = await Promise.all([
            extractTextFromBuffer(req.file.buffer, req.file.mimetype),
            uploadBuffer({
                buffer: req.file.buffer,
                contentType: req.file.mimetype,
                folder: 'resumes',
                ext: EXT_BY_MIME[req.file.mimetype] || 'bin',
            }),
        ]);

        if (!text || text.trim().length < 50) {
            throw new HttpError(400, 'Could not extract readable text from this file. Try a different format.');
        }

        res.json({ file_url: url, file_name: req.file.originalname, extracted_text: text.slice(0, 8000) });
    } catch (err) {
        next(err);
    }
}
