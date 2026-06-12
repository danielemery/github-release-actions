import { ContextArgument } from "./context";
import { collectPrereleases } from "./collect-prereleases";

export async function performPostRelease(
  { octokit, context, logger }: ContextArgument,
  targetReleaseId: number
) {
  const { owner, repo } = context.repo;

  logger.info(`Fetching target release (${targetReleaseId})`);
  const { data: targetRelease } = await octokit.rest.repos.getRelease({
    owner,
    repo,
    release_id: targetReleaseId,
  });

  if (targetRelease.draft) {
    // Find all prereleases that will be included in the target release.
    // A draft's tag only exists once the draft is published, so when the tag
    // is missing (e.g. promoting a prerelease to a new stable tag) ancestry
    // comparisons pivot on the draft's target commitish instead.
    logger.info("Target is a draft release, finding prereleases to bundle up");
    let comparisonRef = targetRelease.tag_name;
    try {
      await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `tags/${targetRelease.tag_name}`,
      });
    } catch (e) {
      if ((e as { status?: number }).status !== 404) {
        throw e;
      }
      logger.debug(
        `Tag ${targetRelease.tag_name} does not exist yet, comparing against ${targetRelease.target_commitish}`
      );
      comparisonRef = targetRelease.target_commitish;
    }
    const { olderPrereleases, newerPrereleases } = await collectPrereleases(
      { octokit, context, logger },
      comparisonRef
    );

    // Delete all these prereleases
    logger.info(
      `Found ${olderPrereleases.length} older prereleases to cleanup, ${newerPrereleases.length} newer prereleases to update release notes for.`
    );
    for (const prerelease of olderPrereleases) {
      logger.debug(
        `Deleting prerelease ${prerelease.tag_name} (${prerelease.id})`
      );
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
      } else {
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
    logger.info(
      `Draft release promoted to latest: ${updatedRelease.data.html_url}`
    );

    // Regenerate release notes for all newer prereleases
    for (const prerelease of newerPrereleases) {
      logger.debug(`Regenerating release notes for ${prerelease.tag_name}`);
      const { data: releaseNotes } =
        await octokit.rest.repos.generateReleaseNotes({
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
  } else {
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
