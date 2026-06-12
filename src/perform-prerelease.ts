import { ContextArgument } from "./context";
import { findRelease } from "./find-release";

/**
 * Resolve the commit sha a tag points at, dereferencing annotated tags.
 * Returns null if the tag does not exist.
 */
async function resolveTagCommit(
  { octokit, context }: ContextArgument,
  tagName: string
): Promise<string | null> {
  const { owner, repo } = context.repo;
  try {
    const ref = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `tags/${tagName}`,
    });
    let { sha, type } = ref.data.object;
    while (type === "tag") {
      const tagObject = await octokit.rest.git.getTag({
        owner,
        repo,
        tag_sha: sha,
      });
      sha = tagObject.data.object.sha;
      type = tagObject.data.object.type;
    }
    return sha;
  } catch (e) {
    if ((e as { status?: number }).status === 404) {
      return null;
    }
    throw e;
  }
}

/**
 * Derive the stable tag a semver prerelease tag promotes to, e.g.
 * v1.2.3-rc.2 -> v1.2.3. Returns null for anything that is not a
 * v-prefixed semver prerelease tag.
 */
export function deriveStableTag(prereleaseTagName: string): string | null {
  const match = prereleaseTagName.match(
    /^(v\d+\.\d+\.\d+)-[0-9A-Za-z-]+\.\d+$/
  );
  return match ? match[1] : null;
}

export async function performPreRelease(
  { octokit, context, logger }: ContextArgument,
  targetTagName: string,
  /**
   * When promoting a semver prerelease to its stable release, set to true to
   * derive the stable tag from the prerelease tag (e.g. v1.2.3-rc.2 ->
   * v1.2.3). The draft is created with the stable tag name anchored to the
   * prerelease's commit; GitHub creates the tag itself when the draft is
   * published by perform-post-release.
   */
  promoteToStable = false
) {
  const { owner, repo } = context.repo;

  let stableTagName: string | undefined;
  if (promoteToStable) {
    const derived = deriveStableTag(targetTagName);
    if (!derived) {
      throw new Error(
        `Cannot promote '${targetTagName}' to stable: expected a semver prerelease tag like v1.2.3-rc.2.`
      );
    }
    stableTagName = derived;
  }

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
    const releaseTagName = stableTagName ?? targetTagName;
    logger.info(
      stableTagName
        ? `Target is a prerelease, creating a draft release for stable tag ${stableTagName}`
        : `Target is a prerelease, creating a draft release`
    );

    let targetCommitish: string | undefined;
    if (stableTagName) {
      const prereleaseCommit = await resolveTagCommit(
        { octokit, context, logger },
        targetTagName
      );
      if (!prereleaseCommit) {
        throw new Error(`No tag found for prerelease: ${targetTagName}`);
      }
      // Tolerate a re-run after a partial failure, but refuse to move an
      // existing stable tag to a different commit.
      const existingStableCommit = await resolveTagCommit(
        { octokit, context, logger },
        stableTagName
      );
      if (existingStableCommit && existingStableCommit !== prereleaseCommit) {
        throw new Error(
          `Stable tag ${stableTagName} already exists and points at ${existingStableCommit}, ` +
            `not the commit of ${targetTagName} (${prereleaseCommit}).`
        );
      }
      targetCommitish = prereleaseCommit;
    }

    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner,
      repo,
    });

    const { data: releaseNotes } =
      await octokit.rest.repos.generateReleaseNotes({
        owner,
        repo,
        tag_name: releaseTagName,
        previous_tag_name: latestRelease.data.tag_name,
        ...(targetCommitish ? { target_commitish: targetCommitish } : {}),
      });

    const { data: draftRelease } = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: releaseTagName,
      name: releaseTagName,
      draft: true,
      body: releaseNotes.body,
      ...(targetCommitish ? { target_commitish: targetCommitish } : {}),
    });

    logger.info(
      `Created draft release (${draftRelease.id}): ${draftRelease.html_url}`
    );

    return {
      releaseId: draftRelease.id,
      isExistingRelease: false,
      releaseUrl: draftRelease.html_url,
      releaseTag: releaseTagName,
    };
  }

  if (stableTagName) {
    throw new Error(
      `promote-to-stable was set but target ${targetTagName} is already a ` +
        `full release; it can only be used when promoting a prerelease.`
    );
  }

  logger.info(
    `Target is an existing release (${targetRelease.id}), proceeding with rollback/roll forward: ${targetRelease.html_url}`
  );
  return {
    releaseId: targetRelease.id,
    isExistingRelease: true,
    releaseUrl: targetRelease.html_url,
    releaseTag: targetRelease.tag_name,
  };
}
