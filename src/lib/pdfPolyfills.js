// pdfjs-dist's legacy Node build tries to polyfill DOMMatrix/ImageData/Path2D via the
// optional native package @napi-rs/canvas, for page rendering. We only ever call
// getTextContent() — never render — but on Vercel's Linux serverless runtime that native
// module fails to load and pdf.mjs throws `DOMMatrix is not defined` at import time,
// crashing the whole function before any route (even /api/health) can run. Minimal stubs
// are enough since text extraction never calls into them.
if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {};
}
