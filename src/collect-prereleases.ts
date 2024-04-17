import { ContextArgument } from "./context";

const DEFAULT_MAX_PAGE_SEARCH = 5;

/**
 * Note the result of the GitHub API calls have many more fields.
 * This interface only contains those in use.
 */
interface Prerelease {
  tag_name: string;
  id: number;
  body?: string | null;
}

/**
 * Collect all prereleases, splitting those newer and older than a given tag into two separate lists.
 * @param context Context argument
 * @param excludePrereleasesAheadOfTag Separate prereleases into those newer than this tag and those older than this tag in the results.
 *                                     A prerelease matching this tag exactly will be included in the olderReleases list.
 * @param maxPageSearch The maximum number of pages to look back through for prereleases. Default is 5.
 * @returns The list of prereleases and the number of newer prereleases found (and skipped).
 */
export async function collectPrereleases(
  { octokit, context, logger }: ContextArgument,
  excludePrereleasesAheadOfTag: string,
  maxPageSearch = DEFAULT_MAX_PAGE_SEARCH
) {
  const { owner, repo } = context.repo;

  // Collect all prereleases (within the max page limit)
  const releasesIterator = octokit.paginate.iterator(
    octokit.rest.repos.listReleases,
    {
      owner,
      repo,
    }
  );
  let allPrereleases: Prerelease[] = [];
  let currentPage = 1;
  for await (const value of releasesIterator) {
    logger.debug(
      `Searching through release page #${currentPage} for prereleases`
    );
    allPrereleases = allPrereleases.concat(
      value.data.filter((release) => release.prerelease)
    );
    if (currentPage > maxPageSearch) {
      break;
    }
    currentPage++;
  }

  // Split prereleases into older and newer than the target release
  const newerPrereleases: Prerelease[] = [];
  const olderPrereleases: Prerelease[] = [];
  for (const prerelease of allPrereleases) {
    const diff = await octokit.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${prerelease.tag_name}...${excludePrereleasesAheadOfTag}`,
    });

    logger.debug(
      `Comparing ${prerelease.tag_name} and ${excludePrereleasesAheadOfTag}, ahead by: ${diff.data.ahead_by}, behind by: ${diff.data.behind_by}`
    );

    if (diff.data.behind_by > 0) {
      logger.debug(
        `Prerelease ${prerelease.tag_name} is newer than target release, adding to newer list`
      );
      newerPrereleases.push(prerelease);
    } else {
      logger.debug(
        `Prerelease ${prerelease.tag_name} is older than target release, adding to older list`
      );
      olderPrereleases.push(prerelease);
    }
  }
  return {
    olderPrereleases,
    newerPrereleases,
  };
}
