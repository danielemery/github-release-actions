# github-release-action

Optinionated set of github release actions for tagging and deployments.

## Overview

### danielemery/github-release-action/create-prerelease

![Diagram explaining the create-prerelease action](./docs/create-prerelease.png)

#### Example Usage in a job

```yml
jobs:
  example-main:
    runs-on: ubuntu-latest
    permissions:
      contents: write # Write is required to create/update releases AND to write tags
    environment: staging
    steps:
      - name: Generate version based on date
        run: echo "RELEASE_VERSION=$(date '+%Y-%m-%d_%H_%M')" >> $GITHUB_ENV

      - name: Create some artifacts
        run: echo "Some artifacts created using ${{ env.RELEASE_VERSION }}"

      - name: Deploy to staging
        run: echo "Created artifacts deployed to staging environment"

      - name: Create release
        uses: danielemery/github-release-action/create-prerelease@main # TODO target a static release
        with:
          release-version: ${{ env.RELEASE_VERSION }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Development

Since the node modules need to be commited to the repo the usual process is:

1. Run `npm ci` to install prod and dev dependencies
2. Make your changes to the ts code in src
3. Run `npm run build` to compile the ts code to js
4. Run `npm ci --omit dev` to remove the dev dependencies
5. Commit the changes to the repo
