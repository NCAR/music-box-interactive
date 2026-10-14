---
name: Version Release
about: Create an issue to make a new release
title: 'Release X.X.X'
labels: ''
assignees: ''
---

## Pre-release

- [ ] GitHub Actions are passing on `main` (Run Tests, Lint, and Build and push container image)
- [ ] On the devel site (https://musicbox-devel.acom.ucar.edu), which runs the latest `main`:
  - [ ] Load and run each example
  - [ ] Upload and download a configuration
  - [ ] Download the results
- [ ] On a new branch (do **not** name it `release`), update the version and the dependencies:
  - [ ] Update `@ncar/music-box` in `package.json` to a released version (not a commit or a branch)
  - [ ] Update the version number in `package.json` and `package-lock.json`.
    - `npm version X.X.X --no-git-tag-version` updates both files
  - [ ] Merge this branch into `main`
- [ ] On GitHub, merge `main` into `release` — **do NOT squash and merge**
  - Alternatively, merge locally and push: `git checkout release && git merge main && git push`
- [ ] Create a tag and add release notes on GitHub — be sure to select the `release` branch as the target
  - The tag must have the form `vX.X.X`, for example `v4.0.0`. Only a tag with this form deploys to production.
  - Do not use a suffix such as `v4.0.0-rc1` unless you want that version on the production site. The "pre-release" setting does not stop the deployment.

---

## Production deployment (automatic)

The tag starts the "Build and push container image" action. It builds the production image and sets the new tag in `deploy/kustomization/overlays/prod` on the `deploy` branch. The cluster then deploys that image.

- [ ] Verify the "Build and push container image" action for the tag passed
- [ ] Verify that the prod overlay on the `deploy` branch has `newTag: vX.X.X`
- [ ] Verify that https://musicbox.acom.ucar.edu shows `vX.X.X` in the navigation bar, and that an example runs
