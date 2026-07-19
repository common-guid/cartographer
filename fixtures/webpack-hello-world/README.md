# webpack-hello-world — JS Cartographer Test Fixture

A small webpack application with **known source code**, used as a ground truth to validate JS Cartographer's deobfuscation pipeline. This fixture implements a **task manager** with filtering and cross-file dependencies, providing a more realistic test target than a simple hello-world app.

## Purpose

This fixture lets you answer the question: *"Given a webpack bundle, how accurately does JS Cartographer recover the original code?"*

The workflow is:
1. The **source files** (`src/`) are the ground truth — meaningful names, readable structure.
2. Webpack + Babel (IE11 target) produces `dist/bundle.js` — minified, obfuscated, with single-letter variable names.
3. Run JS Cartographer against `dist/bundle.js`.
4. Compare the recovered output against the original `src/` files.

## Source Structure

```
src/
├── tasks.js       — Core task data model and utilities (createTask, updateTaskStatus, TaskStatus enum)
├── storage.js     — TaskStore class for in-memory task persistence; imports from tasks.js
├── filters.js     — Async filtering and search operations (filterTasksByStatus, searchTasks, getTaskStats); imports from tasks.js
└── app.js         — Entry point; orchestrates tasks, storage, and filters with 5 dummy tasks
```

## What Each File Tests

| File | Wakaru Rules Exercised | Feature |
|---|---|---|
| `tasks.js` | `smart-rename`, `un-numeric-literal` | Pure functions and constants, cross-file import source |
| `storage.js` | `un-es6-class`, `un-template-literals` | Class → prototype pattern restoration |
| `filters.js` | `un-async-await` | Generator state machine → async/await restoration |
| `app.js` | All of the above | Full call graph: 8+ cross-file edges, realistic app logic |

## Expected Call Graph (Ground Truth)

```
app.js:initializeApp
├── storage.js:TaskStore (constructor, addTask, getAllTasks, updateTask, saveToStorage)
├── tasks.js:createTask (×5 task creations)
├── filters.js:getTaskStats (×3 calls)
├── filters.js:filterTasksByStatus
├── filters.js:searchTasks
└── storage.js:TaskStore.updateTask

app.js:displayTaskList
└── filters.js:getTaskStats
```

## Dummy Data

The fixture includes **5 sample tasks** with varying statuses (pending, in-progress, completed) and priorities (low, medium, high, critical):
1. "Review pull requests" (in-progress, high priority)
2. "Write unit tests" (pending, critical priority)
3. "Update documentation" (completed, medium priority)
4. "Deploy to staging" (pending, high priority)
5. "Fix null reference bug" (in-progress, critical priority)

## How to Use as a Validation Target

```bash
# From the JS Cartographer root:
npm run build
npm start -- openai fixtures/webpack-hello-world/dist/bundle.js -o /tmp/cartographer-out

# Then compare recovered names against src/
diff fixtures/webpack-hello-world/src/ /tmp/cartographer-out/
```

## Rebuild the Bundle

The pre-built `dist/bundle.js` is committed so you can run JS Cartographer without building first. To rebuild after source changes:

```bash
cd fixtures/webpack-hello-world
npm install
npm run build
```

The build uses:
- **webpack 5** in production mode (Terser minification + tree shaking)
- **Babel** with `@babel/preset-env` targeting IE11 — this forces:
  - `async/await` → generator state machines (`_asyncToGenerator`)
  - `class` syntax → prototype-chain functions
  - Template literals → string concatenation
  - Arrow functions → regular functions
