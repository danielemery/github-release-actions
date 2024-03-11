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
exports.performPreRelease = void 0;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const context_1 = require("./context");
const find_release_1 = require("./find-release");
async function performPreRelease({ octokit, context, logger }, targetTagName) {
    const { owner, repo } = context.repo;
    const targetRelease = await (0, find_release_1.findRelease)({ octokit, context, logger }, targetTagName);
    if (!targetRelease) {
        throw new Error(`No release found for tag: ${targetTagName}`);
    }
    if (targetRelease.draft) {
        throw new Error(`Target is a draft release, failing due to possible race condition`);
    }
    if (targetRelease.prerelease) {
        logger.info(`Target is a prerelease, creating a draft release`);
        const latestRelease = await octokit.rest.repos.getLatestRelease({
            owner,
            repo,
        });
        const { data: releaseNotes } = await octokit.rest.repos.generateReleaseNotes({
            owner,
            repo,
            tag_name: targetTagName,
            previous_tag_name: latestRelease.data.tag_name,
        });
        const { data: draftRelease } = await octokit.rest.repos.createRelease({
            owner,
            repo,
            tag_name: targetTagName,
            name: targetTagName,
            draft: true,
            body: releaseNotes.body,
        });
        return {
            releaseId: draftRelease.id,
            isExistingRelease: false,
        };
    }
    logger.info(`Target is an existing release, proceeding with rollback/roll forward: ${targetRelease.html_url}`);
    return {
        releaseId: targetRelease.id,
        isExistingRelease: true,
    };
}
exports.performPreRelease = performPreRelease;
function default_1(targetTagName) {
    const githubToken = core.getInput('github-token');
    const octokit = github.getOctokit(githubToken);
    return performPreRelease((0, context_1.createContext)(octokit, github.context), targetTagName);
}
exports.default = default_1;
//# sourceMappingURL=action-perform-prerelease.js.map