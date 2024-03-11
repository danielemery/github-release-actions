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
exports.createPrerelease = void 0;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const context_1 = require("./context");
async function createPrerelease({ octokit, context, logger }, tag) {
    const { owner, repo } = context.repo;
    await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${tag}`,
        sha: context.sha,
    });
    const newRelease = await octokit.rest.repos.createRelease({
        owner,
        repo,
        prerelease: true,
        tag_name: tag,
        name: tag,
        generate_release_notes: true,
    });
    logger.info(`Created prerelease: ${newRelease.data.html_url}`);
}
exports.createPrerelease = createPrerelease;
function default_1(tag) {
    const githubToken = core.getInput('github-token');
    const octokit = github.getOctokit(githubToken);
    return createPrerelease((0, context_1.createContext)(octokit, github.context), tag);
}
exports.default = default_1;
//# sourceMappingURL=action-create-prerelease.js.map