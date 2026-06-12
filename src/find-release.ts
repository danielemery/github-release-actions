import { ContextArgument } from "./context";
const DEFAULT_MAX_PAGE_SEARCH = 5;

/**
 * Find the release with the given tag name.
 * @param context Context argument
 * @param targetTagName The tag name to search for.
 * @param maxPageSearch The maximum number of pages to search through. Default is 5.
 * @returns The release if found, otherwise null.
 */
export async function findRelease(
  { octokit, context, logger }: ContextArgument,
  targetTagName: string,
  maxPageSearch = DEFAULT_MAX_PAGE_SEARCH
) {
  const { owner, repo } = context.repo;

  // Direct lookup first: unlike the list endpoint it is read-after-write
  // consistent, so a release created moments earlier is found reliably.
  // Drafts are not addressable by tag, so fall through to the list search
  // below which can still surface them.
  try {
    const { data: release } = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: targetTagName,
    });
    return release;
  } catch (e) {
    if ((e as { status?: number }).status !== 404) {
      throw e;
    }
    logger.debug(
      `No published release found by tag ${targetTagName}, searching the release list`
    );
  }

  const releasesIterator = octokit.paginate.iterator(
    octokit.rest.repos.listReleases,
    {
      owner,
      repo,
    }
  );
  let currentPage = 1;
  for await (const value of releasesIterator) {
    logger.debug(`Searching through release page #${currentPage}`);
    const matchingRelease = value.data.find(
      (release) => release.tag_name === targetTagName
    );
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
