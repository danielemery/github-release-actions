import * as github from "@actions/github";
import * as core from "@actions/core";
import { createContext } from "./context";
import { performPreRelease } from "./perform-prerelease";

const githubToken = core.getInput("github-token");
const targetTagName = core.getInput("release-version");
const octokit = github.getOctokit(githubToken);
performPreRelease(createContext(octokit, github.context), targetTagName)
  .then((result) => {
    core.setOutput("release-id", result.releaseId);
    core.setOutput("is-existing-release", result.isExistingRelease);
    core.setOutput("release-url", result.releaseUrl);
  })
  .catch((e) => {
    core.setFailed(e);
  });
