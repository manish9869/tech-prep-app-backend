import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Talks to Supabase Storage's plain REST API directly with the service-role key.
// (Deliberately not using @supabase/supabase-js here: its client unconditionally spins up
// a Realtime websocket client on construction, which requires a `ws` polyfill on Node <22
// for a feature this server never uses — a plain fetch avoids that dependency entirely.)
export async function uploadBuffer({ buffer, contentType, folder, ext }) {
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploadUrl = `${env.supabaseUrl}/storage/v1/object/${env.supabaseStorageBucket}/${path}`;

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
            apikey: env.supabaseServiceRoleKey,
            'Content-Type': contentType,
            'x-upsert': 'false',
        },
        body: buffer,
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Supabase Storage upload failed (${response.status}): ${text}`);
    }

    const url = `${env.supabaseUrl}/storage/v1/object/public/${env.supabaseStorageBucket}/${path}`;
    return { path, url };
}
