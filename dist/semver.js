"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_BUMPS = exports.SEMVER_LABEL_PREFIX = void 0;
exports.isBump = isBump;
// src/semver.ts
exports.SEMVER_LABEL_PREFIX = "semver:";
exports.VALID_BUMPS = ["major", "minor", "patch"];
/** Type guard narrowing an arbitrary string to a valid bump. */
function isBump(value) {
    return exports.VALID_BUMPS.includes(value);
}
//# sourceMappingURL=semver.js.map