# Releasing venn-diagram-lab to npm

Prerequisites (one-time):
- An npm account that owns the `venn-diagram-lab` name (currently unclaimed).
- Add an `NPM_TOKEN` (automation token) to the GitHub repo secrets.

Release:
1. Ensure `main` is green and `packages/node/package.json` version is bumped (e.g. 2.4.0) with a matching CHANGELOG entry.
2. Tag and push: `git tag npm-v2.4.0 && git push origin npm-v2.4.0`.
3. The `npm-publish` workflow builds, tests, and runs `npm publish --provenance --access public`.
4. Verify: `npm view venn-diagram-lab version`.

Notes:
- `@venn-diagram-lab/core` is private and bundled into the published package — it is NOT published separately.
- The published tarball bundles the 44 SVG model templates + 5 sample datasets (~1 MB packed).
- Local dry run: `npm publish -w venn-diagram-lab --dry-run`.
