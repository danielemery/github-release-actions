import * as github from "@actions/github";
import * as core from "@actions/core";
import { createContext } from "./context";
import { performPostRelease } from "./perform-postrelease";

const githubToken = core.getInput("github-token");
const releaseId = core.getInput("release-id");
const octokit = github.getOctokit(githubToken);
performPostRelease(createContext(octokit, github.context), Number(releaseId))
  .then((result) => {
    core.setOutput("release-url", result.releaseUrl);
  })
  .catch((e) => {
    core.setFailed(e);
  });
