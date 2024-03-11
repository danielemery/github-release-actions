import { ContextArgument } from "./context";
import { findRelease } from "./find-release";

export async function performPreRelease(
  { octokit, context, logger }: ContextArgument,
  targetTagName: string
) {
  const { owner, repo } = context.repo;

  const targetRelease = await findRelease(
    { octokit, context, logger },
    targetTagName
  );
  if (!targetRelease) {
    throw new Error(`No release found for tag: ${targetTagName}`);
  }
  if (targetRelease.draft) {
    throw new Error(
      `Target is a draft release, failing due to possible race condition`
    );
  }

  if (targetRelease.prerelease) {
    logger.info(`Target is a prerelease, creating a draft release`);

    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner,
      repo,
    });

    const { data: releaseNotes } =
      await octokit.rest.repos.generateReleaseNotes({
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

    return {
      releaseId: draftRelease.id,
      isExistingRelease: false,
    };
  }

  logger.info(
    `Target is an existing release, proceeding with rollback/roll forward: ${targetRelease.html_url}`
  );
  return {
    releaseId: targetRelease.id,
    isExistingRelease: true,
  };
}
