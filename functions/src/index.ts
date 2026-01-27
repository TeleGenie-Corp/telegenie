import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as https from "https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
    admin.initializeApp();
}

class ChannelService {
    async getChannelInfo(username: string) {
        const url = `https://t.me/s/${username}`;
        try {
            const html = await this._fetchUrl(url);
            return this._parseHtml(username, html);
        } catch (error: any) {
            return { error: error.message };
        }
    }

    private _fetchUrl(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => resolve(data));
            }).on('error', (err) => reject(err));
        });
    }

    private _parseHtml(username: string, html: string) {
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)">/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
        
        const title = titleMatch ? this._decodeEntity(titleMatch[1]) : "Unknown";
        const description = descMatch ? this._decodeEntity(descMatch[1]) : "No description";
        const image = imageMatch ? imageMatch[1] : null;

        const postRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)<\/div>/gs;
        
        const posts: string[] = [];
        let match;
        while ((match = postRegex.exec(html)) !== null) {
            const rawContent = match[1];
            if(rawContent.trim().length > 0) {
                posts.push(this._cleanText(rawContent));
            }
        }
        return {
            username: username,
            title: title,
            description: description,
            image: image,
            stats: {
                scraped_posts_count: posts.length
            },
            last_posts: posts.slice(-5)
        };
    }

    private _cleanText(html: string) {
        let text = html.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<[^>]+>/g, '');
        return this._decodeEntity(text).trim();
    }

    private _decodeEntity(str: string) {
        return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
                  .replace(/&quot;/g, '"')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>');
    }
}

export const getChannelInfo = onRequest({ cors: true }, async (req, res) => {
    const username = (req.query.name as string) || (req.body.name as string) || 'nenashev_vision';
    
    logger.info(`Processing request for target: ${username}`, { structuredData: true });
    
    const service = new ChannelService();
    const result = await service.getChannelInfo(username);
    res.json(result);
});

/**
 * Administrative function to seed $1000 credits to all existing users.
 * Requires a special secret key in headers for safety.
 */
export const seedCredits = onRequest({ cors: true }, async (req, res) => {
    const authSecret = req.headers['x-migration-secret'];
    if (authSecret !== 'TElegenIe_Studio_2026_SeEd') {
        res.status(403).send('Unauthorized');
        return;
    }

    try {
        const auth = admin.auth();
        const db = admin.firestore();
        const listUsersResult = await auth.listUsers();
        
        const results: any[] = [];
        for (const userRecord of listUsersResult.users) {
            const userRef = db.collection('users').doc(userRecord.uid);
            const doc = await userRef.get();

            if (!doc.exists) {
                const profile = {
                    userId: userRecord.uid,
                    savedStrategies: [] as any[],
                    generationHistory: [] as any[],
                    balance: 1000,
                    createdAt: Date.now(),
                    migrated: true
                };
                await userRef.set(profile);
                results.push({ uid: userRecord.uid, action: 'created' });
            } else {
                const data = doc.data();
                if (data?.balance === undefined) {
                    await userRef.update({ balance: 1000, migrated: true });
                    results.push({ uid: userRecord.uid, action: 'updated' });
                } else {
                    results.push({ uid: userRecord.uid, action: 'skipped' });
                }
            }
        }
        res.json({ success: true, processed: results.length, details: results });
    } catch (error: any) {
        logger.error('Migration failed:', error);
        res.status(500).json({ error: error.message });
    }
});
