# Tests

This project keeps tests in the `test/` folder and groups them for easier runs:

- `test/unit/` — fast, focused unit tests for game logic.
- `test/integration/` — integration-style feature and UI-adjacent tests.

By default the Vitest config includes `test/**/*.spec.js`, so `npm test` will run everything.

Quick commands

- Run all tests (fast):

```bash
npm test
# or: npx vitest run
```

- Run only unit tests:

```bash
npx vitest run test/unit/**
# or (if you prefer npm): npm test -- test/unit/**
```

- Run only integration tests:

```bash
npx vitest run test/integration/**
# or: npm test -- test/integration/**
```

- Run coverage (produces text + HTML under `coverage/`):

```bash
npm run coverage
```

Notes

- Tests use ESM-style imports; when adding new tests place them under `test/unit` or `test/integration` and use relative imports to `src/` (for example `import { foo } from '../../src/...';`).
- If you want to run only a single spec file, provide its path to `npx vitest run`.

If you want, I can update `package.json` with dedicated npm scripts for `test:unit` and `test:integration` to make these commands shorter.
