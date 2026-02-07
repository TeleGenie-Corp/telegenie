"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelService = void 0;
const https = __importStar(require("https"));
class ChannelService {
    async getChannelInfo(username) {
        const url = `https://t.me/s/${username}`;
        try {
            const html = await this._fetchUrl(url);
            return this._parseHtml(username, html);
        }
        catch (error) {
            return { error: error.message };
        }
    }
    _fetchUrl(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => resolve(data));
            }).on('error', (err) => reject(err));
        });
    }
    _parseHtml(username, html) {
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)">/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
        const title = titleMatch ? this._decodeEntity(titleMatch[1]) : "Unknown";
        const description = descMatch ? this._decodeEntity(descMatch[1]) : "No description";
        const image = imageMatch ? imageMatch[1] : null;
        const postRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)<\/div>/gs;
        const posts = [];
        let match;
        while ((match = postRegex.exec(html)) !== null) {
            const rawContent = match[1];
            if (rawContent.trim().length > 0) {
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
    _cleanText(html) {
        let text = html.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<[^>]+>/g, '');
        return this._decodeEntity(text).trim();
    }
    _decodeEntity(str) {
        return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }
}
exports.ChannelService = ChannelService;
//# sourceMappingURL=channel.service.js.map