"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrerelease = void 0;
async function createPrerelease({ octokit, context, logger }, tag) {
    const { owner, repo } = context.repo;
    await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${tag}`,
        sha: context.sha,
    });
    const newRelease = await octokit.rest.repos.createRelease({
        owner,
        repo,
        prerelease: true,
        tag_name: tag,
        name: tag,
        generate_release_notes: true,
    });
    logger.info(`Created prerelease: ${newRelease.data.html_url}`);
}
exports.createPrerelease = createPrerelease;
//# sourceMappingURL=create-prerelease.js.map