# Moti-Do Todo Application

A modular todo list application with a clear separation between backend and frontend. This project is organized as a monorepo with strict TypeScript typing, comprehensive documentation, and thorough testing.

## Project Structure

- **packages/shared/** - Core types, interfaces, and APIs used by both CLI and UI
- **packages/cli/** - Command line interface implementation (backend)
- **packages/ui/** - Web UI implementation (to be added later)

## Architecture

This project intentionally separates the backend (CLI) from the frontend (UI):

1. The **shared** package defines the API interface and data types
2. The **cli** package implements a thin wrapper around this API
3. The **ui** package (future) will use the same API

This design ensures consistent behavior between interfaces and allows for testing in isolation.

## Getting Started

### Prerequisites

- Node.js >= 16
- pnpm >= 8

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build all packages:
   ```bash
   pnpm build
   ```

### Running the CLI

You can run the CLI directly:

```bash
node packages/cli/dist/index.js --help
```

Or create a global link to make the command available:

```bash
pnpm link --global packages/cli
```

Then use it:

```bash
moti-do --help
```

## Available Commands

- `moti-do add --title "Task name" --priority high` - Add a new todo
- `moti-do list` - List all todos
- `moti-do complete --id <id>` - Mark a todo as completed
- `moti-do delete --id <id>` - Delete a todo
- `moti-do demo` - Create sample todos for testing

## Development

- `pnpm dev:cli` - Watch and rebuild CLI on changes
- `pnpm build:cli` - Build the CLI
- `pnpm test` - Run all tests

## Design Decisions

This project follows a strict modular design pattern:

1. **Core Logic in Shared** - All business logic lives in the shared package
2. **Interface Layers** - CLI and UI are thin wrappers around the shared logic
3. **Strict Typing** - TypeScript with strict mode ensures type safety
4. **Comprehensive Documentation** - All code is thoroughly documented
5. **Test Coverage** - Unit tests for all functionality 