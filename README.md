# tblparse

[![npm version](https://badge.fury.io/js/@rindrics%2Ftblparse.svg)](https://badge.fury.io/js/@rindrics%2Ftblparse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


A library for detecting and parsing table blocks from Excel/CSV files.

## Demo

👉 [Live Demo](https://tblparse.rindrics.com/)

## Project Structure

```text
tblparse/
├── packages/
│   └── core/          # @rindrics/tblparse - Core library
└── apps/
    └── demo/          # Demo site (React + Vite)
```

## Packages

| Package | Description |
|---------|-------------|
| [@rindrics/tblparse](./packages/core) | Table block detection library for Excel/CSV files |

## Development

```bash
# Install dependencies
bun install

# Run demo site
bun run dev

# Run tests
bun run test

# Build
bun run build
```

## License

MIT
