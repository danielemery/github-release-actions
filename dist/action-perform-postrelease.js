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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performPostRelease = void 0;
const action_1 = require("@octokit/action");
const github = __importStar(require("@actions/github"));
const context_1 = require("./context");
const collect_prereleases_1 = require("./collect-prereleases");
async function performPostRelease({ octokit, context, logger }, targetReleaseId) {
    const { owner, repo } = context.repo;
    const { data: targetRelease } = await octokit.rest.repos.getRelease({
        owner,
        repo,
        release_id: targetReleaseId,
    });
    if (targetRelease.draft) {
        // Find older prereleases to delete
        logger.info("Target is a draft release, finding prereleases to bundle up");
        const { prereleases, skippedPreleaseCount } = await (0, collect_prereleases_1.collectPrereleases)({ octokit, context, logger }, targetRelease.tag_name);
        // Delete older prereleases
        logger.info(`Found ${prereleases.length} older prereleases to cleanup, ${skippedPreleaseCount} newer prereleases skipped`);
        for (const olderPrerelease of prereleases) {
            await octokit.rest.repos.deleteRelease({
                owner,
                repo,
                release_id: olderPrerelease.id,
            });
        }
        // Promote draft release to production
        logger.info("Promoting draft release to production");
        await octokit.rest.repos.updateRelease({
            owner,
            repo,
            release_id: targetReleaseId,
            draft: false,
            prerelease: false,
            latest: true,
        });
    }
    else {
        logger.info("Target is an existing release, marking release as latest");
        await octokit.rest.repos.updateRelease({
            owner,
            repo,
            release_id: targetReleaseId,
            make_latest: "true",
        });
    }
}
exports.performPostRelease = performPostRelease;
function default_1(releaseId) {
    const octokit = new action_1.Octokit();
    return performPostRelease((0, context_1.createContext)(octokit, github.context), releaseId);
}
exports.default = default_1;
//# sourceMappingURL=action-perform-postrelease.js.map