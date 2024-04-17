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
        // Find all prereleases that will be included in the target release
        logger.info("Target is a draft release, finding prereleases to bundle up");
        const { olderPrereleases, newerPrereleases } = await (0, collect_prereleases_1.collectPrereleases)({ octokit, context, logger }, targetRelease.tag_name);
        // Delete all these prereleases
        logger.info(`Found ${olderPrereleases.length} older prereleases to cleanup, ${newerPrereleases.length} newer prereleases to update release notes for.`);
        for (const prerelease of olderPrereleases) {
            logger.debug(`Deleting prerelease ${prerelease.tag_name} (${prerelease.id})`);
            await octokit.rest.repos.deleteRelease({
                owner,
                repo,
                release_id: prerelease.id,
            });
            // Exclude deleting the tag for the prerelease that has the same tag as the target release.
            if (prerelease.tag_name !== targetRelease.tag_name) {
                logger.debug(`Deleting tag ${prerelease.tag_name}`);
                await octokit.rest.git.deleteRef({
                    owner,
                    repo,
                    ref: `tags/${prerelease.tag_name}`,
                });
            }
            else {
                logger.debug(`Skipping tag ${prerelease.tag_name}`);
            }
        }
        // Promote draft release to production
        const updatedRelease = await octokit.rest.repos.updateRelease({
            owner,
            repo,
            release_id: targetReleaseId,
            draft: false,
            prerelease: false,
            latest: true,
        });
        logger.info(`Draft release promoted to latest: ${updatedRelease.data.html_url}`);
        // Regenerate release notes for all newer prereleases
        for (const prerelease of newerPrereleases) {
            logger.debug(`Regenerating release notes for ${prerelease.tag_name}`);
            const { data: releaseNotes } = await octokit.rest.repos.generateReleaseNotes({
                owner,
                repo,
                tag_name: prerelease.tag_name,
                previous_tag_name: updatedRelease.data.tag_name,
            });
            await octokit.rest.repos.updateRelease({
                owner,
                repo,
                release_id: prerelease.id,
                body: releaseNotes.body,
            });
        }
        return {
            releaseUrl: updatedRelease.data.html_url,
        };
    }
    else {
        logger.info("Target is an existing release, marking release as latest");
        const updatedRelease = await octokit.rest.repos.updateRelease({
            owner,
            repo,
            release_id: targetReleaseId,
            make_latest: "true",
        });
        return {
            releaseUrl: updatedRelease.data.html_url,
        };
    }
}
exports.performPostRelease = performPostRelease;
//# sourceMappingURL=perform-postrelease.js.map