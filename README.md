# @lucrtrade/chartmint

[![CI](https://github.com/lucrtrade/chartmint/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lucrtrade/chartmint/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/%40lucrtrade%2Fchartmint)](https://www.npmjs.com/package/@lucrtrade/chartmint) [![license](https://img.shields.io/npm/l/%40lucrtrade%2Fchartmint)](https://www.npmjs.com/package/@lucrtrade/chartmint) [![bundle size](https://img.shields.io/bundlephobia/minzip/%40lucrtrade%2Fchartmint)](https://bundlephobia.com/package/@lucrtrade/chartmint) [![NPM Last Update](https://img.shields.io/npm/last-update/%40lucrtrade%2Fchartmint)](https://www.npmjs.com/package/@lucrtrade/chartmint)

A TypeScript ESM library scaffolded with Bun. Built on [`lightweight-charts`](https://www.npmjs.com/package/lightweight-charts).

## Install

```bash
bun add @lucrtrade/chartmint
# or
npm install @lucrtrade/chartmint
```

## Usage

```ts
import { hello } from "@lucrtrade/chartmint";

console.log(hello());
```

## Develop

```bash
bun install         # install deps
bun run dev         # build in watch mode
bun run test        # vitest run
bun run test:watch  # vitest watch mode
bun run lint        # eslint
bun run format      # prettier write
bun run typecheck   # tsc --noEmit
bun run build       # produce dist/ (ESM + .d.ts)
bun run ci          # format:check + lint + typecheck + test
```

## Release

Releases are driven by `package.json`'s `version` on the `main` branch:

1. Bump `version` in `package.json` and merge to `main`.
2. CI runs format / lint / typecheck / test (Bun).
3. On CI success, the Release workflow checks for an existing GitHub release tagged `v<version>`.
4. If absent: build, pack, upload tarball as artifact, then in parallel:
   - Publish to **npm** via [Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers) — `npm publish --provenance --access public`.
   - Publish to **GitHub Packages** using `GITHUB_TOKEN`.
5. If both publishes succeed, create the GitHub release with the tarball attached.

The published tarball contains only `dist/`, `LICENSE`, `README.md`, and `package.json`.

### One-time setup

- npm: configure a [Trusted Publisher](https://docs.npmjs.com/trusted-publishers) on the npm package
  pointing to this repo and the `release.yml` workflow. No `NPM_TOKEN` required.
- GitHub: create a `release` environment under repo Settings → Environments. Attach any
  protection rules / approvals there. `GITHUB_TOKEN` is provided automatically with
  `packages: write` for GitHub Packages.

## License

MIT
