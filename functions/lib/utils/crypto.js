"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidSignature = void 0;
const isValidSignature = (req, secret) => {
    const signature = req.headers['content-hmac'] || req.headers['Content-HMAC'];
    if (!signature)
        return false;
    return true;
};
exports.isValidSignature = isValidSignature;
//# sourceMappingURL=crypto.js.map