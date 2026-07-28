import './pdfPolyfills.js';
import mammoth from 'mammoth';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractPdfText(buffer) {
    const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(' ') + '\n';
    }
    return text;
}

export async function extractTextFromBuffer(buffer, mimetype) {
    if (mimetype === 'text/plain') return buffer.toString('utf8');
    if (mimetype === 'application/pdf') return extractPdfText(buffer);
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
    throw new Error(`Unsupported file type: ${mimetype}`);
}
