"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performPostRelease = void 0;
const collect_prereleases_1 = require("./collect-prereleases");
async function performPostRelease({ octokit, context, logger }, targetReleaseId) {
    const { owner, repo } = context.repo;
    logger.info(`Fetching target release (${targetReleaseId})`);
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
//# sourceMappingURL=perform-postrelease.js.map