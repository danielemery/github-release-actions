import { context, getOctokit } from "@actions/github";
import * as core from "@actions/core";

/**
 * The context exists solely to faciliate testing by inversion of control.
 *
 * It is a simple object that contains everything the action needs to run.
 *
 * Tests will need to create and/or mock the context object manually, in all
 * other cases the createContext function should be used.
 */
export interface ContextArgument {
  octokit: ReturnType<typeof getOctokit>;
  context: Pick<typeof context, "repo" | "sha">;
  logger: {
    debug: typeof core.debug;
    info: typeof core.info;
    warning: typeof core.warning;
    error: typeof core.error;
  };
}

/**
 * Create a context object containing everything each action needs to run.
 *
 * @param octokit The Octokit instance
 * @param githubContext The context object from the GitHub action
 * @returns Fully initialized context object
 */
export function createContext(
  octokit: ReturnType<typeof getOctokit>,
  /*
   * A partial is used here to make mocking easier.
   * Additonal fields can be added as needed.
   */
  githubContext: Pick<typeof context, "repo" | "sha">
) {
  return {
    octokit,
    context: {
      repo: githubContext.repo,
      sha: githubContext.sha,
    },
    logger: {
      debug: core.debug,
      info: core.info,
      warning: core.warning,
      error: core.error,
    },
  };
}
