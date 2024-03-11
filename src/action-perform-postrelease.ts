import * as github from "@actions/github";
import * as core from "@actions/core";
import { ContextArgument, createContext } from "./context";
import { collectPrereleases } from "./collect-prereleases";

export async function performPostRelease(
  { octokit, context, logger }: ContextArgument,
  targetReleaseId: number
) {
  const { owner, repo } = context.repo;

  const { data: targetRelease } = await octokit.rest.repos.getRelease({
    owner,
    repo,
    release_id: targetReleaseId,
  });

  if (targetRelease.draft) {
    // Find older prereleases to delete
    logger.info("Target is a draft release, finding prereleases to bundle up");
    const { prereleases, skippedPreleaseCount } = await collectPrereleases(
      { octokit, context, logger },
      targetRelease.tag_name
    );

    
    // Delete older prereleases
    logger.info(
      `Found ${prereleases.length} older prereleases to cleanup, ${skippedPreleaseCount} newer prereleases skipped`
    );
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
  } else {
    logger.info("Target is an existing release, marking release as latest");
    await octokit.rest.repos.updateRelease({
      owner,
      repo,
      release_id: targetReleaseId,
      make_latest: "true",
    });
  }
}

export default function (releaseId: number) {
  const githubToken = core.getInput('github-token');
  const octokit = github.getOctokit(githubToken)
  return performPostRelease(createContext(octokit, github.context), releaseId);
}
