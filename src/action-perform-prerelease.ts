import * as github from "@actions/github";
import * as core from "@actions/core";
import { createContext } from "./context";
import { performPreRelease } from "./perform-prerelease";

const githubToken = core.getInput("github-token");
const targetTagName = core.getInput("release-version");
const promoteToStable = core.getInput("promote-to-stable") === "true";
const octokit = github.getOctokit(githubToken);
performPreRelease(createContext(octokit, github.context), targetTagName, promoteToStable)
  .then((result) => {
    core.setOutput("release-id", result.releaseId);
    core.setOutput("is-existing-release", result.isExistingRelease);
    core.setOutput("release-url", result.releaseUrl);
    core.setOutput("release-tag", result.releaseTag);
    core.setOutput("release-version", result.releaseTag.replace(/^v/, ""));
  })
  .catch((e) => {
    core.setFailed(e);
  });
