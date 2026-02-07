import * as https from "https";

export class ChannelService {
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
