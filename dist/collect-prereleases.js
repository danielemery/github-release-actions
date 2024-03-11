"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectPrereleases = void 0;
const DEFAULT_MAX_PAGE_SEARCH = 5;
/**
 * Collect all prereleases, optionally filtering out those newer than a given tag.
 * @param context Context argument
 * @param olderThanTag The tag to compare prereleases against.
 * @param maxPageSearch The maximum number of pages to look back through for prereleases. Default is 5.
 * @returns The list of prereleases and the number of newer prereleases found (and skipped).
 */
async function collectPrereleases({ octokit, context, logger }, olderThanTag, maxPageSearch = DEFAULT_MAX_PAGE_SEARCH) {
    const { owner, repo } = context.repo;
    // Collect all prereleases (within the max page limit)
    const releasesIterator = octokit.paginate.iterator(octokit.rest.repos.listReleases, {
        owner,
        repo,
    });
    let prereleases = [];
    let currentPage = 1;
    for await (const value of releasesIterator) {
        logger.debug(`Searching through release page #${currentPage} for prereleases`);
        prereleases = prereleases.concat(value.data.filter((release) => release.prerelease));
        if (currentPage > maxPageSearch) {
            break;
        }
        currentPage++;
    }
    if (olderThanTag === undefined) {
        return { prereleases, newerPreleaseCount: 0 };
    }
    // Determine which prereleases are older than the target release
    let newerPreleaseCount = 0;
    const olderPreleases = [];
    for (const prerelease of prereleases) {
        const diff = await octokit.rest.repos.compareCommitsWithBasehead({
            owner,
            repo,
            basehead: `${prerelease.tag_name}...${olderThanTag}`,
        });
        logger.debug(`Comparing ${prerelease.tag_name} and ${olderThanTag}, ahead by: ${diff.data.ahead_by}, behind by: ${diff.data.behind_by}`);
        if (diff.data.behind_by > 0) {
            logger.debug(`Prerelease ${prerelease.tag_name} is newer than target release, skipping`);
            newerPreleaseCount++;
            continue;
        }
        else {
            logger.debug(`Prerelease ${prerelease.tag_name} is older than target release, adding to list`);
            olderPreleases.push(prerelease);
        }
    }
    return {
        prereleases: olderPreleases,
        skippedPreleaseCount: newerPreleaseCount,
    };
}
exports.collectPrereleases = collectPrereleases;
//# sourceMappingURL=collect-prereleases.js.map