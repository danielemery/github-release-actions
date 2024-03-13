import { ContextArgument } from "./context";

const DEFAULT_MAX_PAGE_SEARCH = 5;

/**
 * Collect all prereleases, optionally filtering out those newer than a given tag.
 * @param context Context argument
 * @param excludePrereleasesAheadOfTag Optionally, exlude prereleases newer than this tag from results.
 *                                     The number that are excluded will be returned in `newerPreleaseCount`.
 * @param maxPageSearch The maximum number of pages to look back through for prereleases. Default is 5.
 * @returns The list of prereleases and the number of newer prereleases found (and skipped).
 */
export async function collectPrereleases(
  { octokit, context, logger }: ContextArgument,
  excludePrereleasesAheadOfTag?: string,
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
  let prereleases: { tag_name: string; id: number; body?: string | null }[] =
    [];
  let currentPage = 1;
  for await (const value of releasesIterator) {
    logger.debug(
      `Searching through release page #${currentPage} for prereleases`
    );
    prereleases = prereleases.concat(
      value.data.filter((release) => release.prerelease)
    );
    if (currentPage > maxPageSearch) {
      break;
    }
    currentPage++;
  }

  if (excludePrereleasesAheadOfTag === undefined) {
    return { prereleases, newerPreleaseCount: 0 };
  }

  // Determine which prereleases are older than the target release
  let newerPreleaseCount = 0;
  const olderPreleases = [];
  for (const prerelease of prereleases) {
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
        `Prerelease ${prerelease.tag_name} is newer than target release, skipping`
      );
      newerPreleaseCount++;
      continue;
    } else {
      logger.debug(
        `Prerelease ${prerelease.tag_name} is older than target release, adding to list`
      );
      olderPreleases.push(prerelease);
    }
  }
  return {
    prereleases: olderPreleases,
    skippedPreleaseCount: newerPreleaseCount,
  };
}
