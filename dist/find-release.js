"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRelease = void 0;
const DEFAULT_MAX_PAGE_SEARCH = 5;
/**
 * Find the release with the given tag name.
 * @param context Context argument
 * @param targetTagName The tag name to search for.
 * @param maxPageSearch The maximum number of pages to search through. Default is 5.
 * @returns The release if found, otherwise null.
 */
async function findRelease({ octokit, context, logger }, targetTagName, maxPageSearch = DEFAULT_MAX_PAGE_SEARCH) {
    const { owner, repo } = context.repo;
    const releasesIterator = octokit.paginate.iterator(octokit.rest.repos.listReleases, {
        owner,
        repo,
    });
    let currentPage = 1;
    for await (const value of releasesIterator) {
        logger.debug(`Searching through release page #${currentPage}`);
        const matchingRelease = value.data.find((release) => release.tag_name === targetTagName);
        if (matchingRelease) {
            return matchingRelease;
        }
        if (currentPage > maxPageSearch) {
            logger.debug(`Reached maximum page size when searching, aborting`);
            break;
        }
        currentPage++;
    }
    return null;
}
exports.findRelease = findRelease;
//# sourceMappingURL=find-release.js.map