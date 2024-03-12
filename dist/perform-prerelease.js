"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performPreRelease = void 0;
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
        logger.info(`Created draft release (${draftRelease.id}): ${draftRelease.html_url}`);
        return {
            releaseId: draftRelease.id,
            isExistingRelease: false,
        };
    }
    logger.info(`Target is an existing release (${targetRelease.id}), proceeding with rollback/roll forward: ${targetRelease.html_url}`);
    return {
        releaseId: targetRelease.id,
        isExistingRelease: true,
    };
}
exports.performPreRelease = performPreRelease;
//# sourceMappingURL=perform-prerelease.js.map