# github-release-action

Optinionated set of github release actions for tagging and deployments.

## Development

Since the node modules need to be commited to the repo the usual process is:

1. Run `npm ci` to install prod and dev dependencies
2. Make your changes to the ts code in src
3. Run `npm run build` to compile the ts code to js
4. Run `npm ci --omit dev` to remove the dev dependencies
5. Commit the changes to the repo
