# Working with Git Worktrees & Claude Code — A Complete Guide

A practical guide to parallelizing your work with git worktrees, written around
the `worktree-practice` repo but applicable to any project (including the
`hai-agents` pnpm monorepo).

---

## Table of contents

1. [What is a worktree?](#1-what-is-a-worktree)
2. [Why it accelerates your work](#2-why-it-accelerates-your-work)
3. [Core commands](#3-core-commands)
4. [The fixed-port problem (localhost:3000 / :4000)](#4-the-fixed-port-problem)
5. [The git flow: push, pull, integrate](#5-the-git-flow-push-pull-integrate)
6. [Worked example: two bugs in parallel](#6-worked-example-two-bugs-in-parallel)
7. [Using worktrees with Claude Code](#7-using-worktrees-with-claude-code)
8. [Handling merge conflicts between branches](#8-handling-merge-conflicts)
9. [Best practices](#9-best-practices)
10. [Common pitfalls](#10-common-pitfalls)
11. [Quick reference](#11-quick-reference)

---

## 1. What is a worktree?

A normal git repository has **one** working directory checked out on **one**
branch. To switch branches you run `git checkout`, which rewrites the files in
place — you can't be on two branches at once.

A **worktree** lets a single repository have **several working directories
checked out simultaneously**, each on its own branch, all sharing the same
`.git` object database (history, stashes, config).

```
my-project/                  ← main worktree   (branch: main)
my-project/.worktrees/
  ├── fix-login/             ← linked worktree (branch: fix/login)
  └── feat-export/           ← linked worktree (branch: feat/export)
```

Three folders, three branches, **one** shared history. A commit you make in one
folder is immediately visible to the others, because they all read and write the
same objects under the main repo's `.git`.

**Worktree vs. clone:** a clone duplicates the whole history on disk and has its
own remotes; worktrees share one history and one set of remotes. Worktrees are
cheaper and keep everything in sync automatically.

**Worktree vs. branch switching:** branching alone still leaves you with one
folder you must keep `checkout`-ing between, stashing half-done work each time.
Worktrees give each branch its own folder, so nothing is ever stashed.

---

## 2. Why it accelerates your work

- **Zero context-switch tax.** Bug A's half-edited files, running server, and
  open tabs stay exactly as they are while you work Bug B in another folder.
- **True parallelism.** Run a separate process — a dev server, a test watcher,
  or an entire Claude Code session — per worktree without interference.
- **Isolation.** A broken `npm install`, a failed DB migration, or a crashed
  server in one worktree never touches the others.
- **Mixed cadence.** A long refactor can churn in one worktree while you ship a
  one-line hotfix from another.

The mental model for Claude Code: **one session edits one working directory.**
For two agents to work in genuine parallel, give each its own worktree —
otherwise their edits, tests, and servers collide.

---

## 3. Core commands

```bash
# List existing worktrees
git worktree list

# Create a worktree on a NEW branch off the current HEAD
git worktree add .worktrees/fix-login -b fix/login

# Create a worktree on a new branch off the latest main (recommended)
git fetch origin
git worktree add .worktrees/fix-login -b fix/login origin/main

# Create a worktree for an EXISTING branch (e.g. to review a PR)
git worktree add .worktrees/review-pr existing-branch-name

# Remove a worktree when you're done (must be clean)
git worktree remove .worktrees/fix-login

# Remove the branch too, once merged
git branch -d fix/login

# Clean up metadata for manually-deleted worktree folders
git worktree prune
```

> **Rule:** a branch can only be checked out in **one** worktree at a time. You
> can't have `main` checked out in two folders simultaneously — git will refuse.

---

## 4. The fixed-port problem

The single most common pain point with parallel worktrees. If both worktrees run
a dev server hardcoded to `:3000`, the second one crashes:

```
Error: listen EADDRINUSE: address already in use :::3000
```

### Fix (best → fallback)

**a) Read the port from the environment.** The code should never hardcode the
port:

```ts
const PORT = Number(process.env.PORT) || 3000;
```

Then give each worktree its own port:

```bash
PORT=3000 npm run dev   # worktree A
PORT=3001 npm run dev   # worktree B
```

**b) Use a per-worktree `.env` file** (git-ignored) so you don't retype it:

```bash
echo "PORT=3000" > .worktrees/fix-login/.env
echo "PORT=3001" > .worktrees/feat-export/.env
```

**c) If the port is genuinely hardcoded** and you can't change it: run only one
dev server at a time. Do manual/visual testing in one worktree, and rely on unit
tests (which don't bind a port) in the other.

### The same applies to every shared resource

| Resource | How to isolate per worktree |
|----------|-----------------------------|
| HTTP port | `PORT` env var, different value each |
| Database  | Different DB name, or a Docker container per worktree |
| Redis/cache | Different port or namespace/prefix |
| File-based state (sqlite, uploads) | Path under the worktree, or a temp dir |
| Log files | Per-worktree path |

For databases specifically, the cleanest pattern is one Docker Compose project
per worktree with a distinct project name and host port.

---

## 5. The git flow: push, pull, integrate

All worktrees share history, but **each branch integrates independently** via its
own PR. The general loop:

```bash
# 1. Always branch off the latest main
git fetch origin
git worktree add .worktrees/task-a -b fix/task-a origin/main

# 2. Work + commit normally inside the folder
cd .worktrees/task-a
# ...edit...
git add -A && git commit -m "fix: correct discount calculation"

# 3. Push the branch and open a PR
git push -u origin fix/task-a
gh pr create --fill

# 4. After review, merge the PR (on GitHub or `gh pr merge`)

# 5. Integrate: bring merged changes back to your other branches
#    In any other active worktree:
git fetch origin
git rebase origin/main      # replay your work on top of the new main
```

**Key integration rule for parallel branches:** the first PR to merge is free.
The second branch should **rebase onto the updated `origin/main`** before merging
so it incorporates the first branch's changes and surfaces any conflict early.

> Your personal convention (from CLAUDE.md): **"sync" = `git fetch` then
> `git rebase origin/main`** on the current branch. That's exactly step 5.

### pull vs. fetch+rebase

- `git pull` = `fetch` + `merge` (creates merge commits).
- `git pull --rebase` (or `fetch` + `rebase`) = replays your commits on top of the
  remote — a linear history, which is usually preferred for feature branches.

---

## 6. Worked example: two bugs in parallel

Using this repo. Bug A is in `src/pricing.ts`, Bug B in `src/dateFormat.ts`.

```bash
# Start clean from main
git fetch origin

# A worktree per bug, each on its own branch
git worktree add .worktrees/fix-pricing-bug -b fix/pricing-bug
git worktree add .worktrees/fix-date-bug    -b fix/date-bug

# Distinct ports so both dev servers can run
echo "PORT=3000" > .worktrees/fix-pricing-bug/.env
echo "PORT=3001" > .worktrees/fix-date-bug/.env

# --- Terminal 1 (or Claude session 1) -------------------------
cd .worktrees/fix-pricing-bug
npm install
npm test                       # 🔴 pricing test fails
# fix: return price * (1 - percentOff / 100)
npm test                       # 🟢
git commit -am "fix: apply discount as a percentage off the price"
git push -u origin fix/pricing-bug
gh pr create --fill

# --- Terminal 2 (or Claude session 2) -------------------------
cd .worktrees/fix-date-bug
npm install
npm test                       # 🔴 date test fails
# fix: use date.getMonth() + 1
npm test                       # 🟢
git commit -am "fix: correct off-by-one month in formatDate"
git push -u origin fix/date-bug
gh pr create --fill

# --- Integrate ------------------------------------------------
# Merge PR #1 (pricing). Then rebase PR #2 onto the new main:
cd .worktrees/fix-date-bug
git fetch origin && git rebase origin/main
git push --force-with-lease    # update the PR after rebase
# Merge PR #2.

# --- Clean up -------------------------------------------------
git worktree remove .worktrees/fix-pricing-bug
git worktree remove .worktrees/fix-date-bug
git branch -d fix/pricing-bug fix/date-bug
```

Because the two bugs live in different files, the rebase in this example is
conflict-free. Section 8 covers what to do when it isn't.

> Note: `--force-with-lease` is used (not `--force`) per your CLAUDE.md — it
> refuses to overwrite if someone else pushed in the meantime.

---

## 7. Using worktrees with Claude Code

- **Native worktree tool first.** Claude Code can create an isolated workspace
  for you (e.g. an `EnterWorktree` tool / `--worktree` flag). Prefer it over raw
  `git worktree add` — it handles placement, branch creation, and cleanup, and
  the harness stays aware of the worktree. Only fall back to `git worktree add`
  when no native tool exists.
- **One session per worktree.** Open a separate Claude Code session (separate
  terminal tab/window) rooted in each worktree folder. Each agent then has its
  own isolated files, server, and tests.
- **Let each session verify independently.** Each one runs its own `npm test` and
  its own dev server (on its own port) and confirms green before committing.
- **Keep the `.worktrees/` directory git-ignored** so worktree contents are never
  accidentally committed.

For the `hai-agents` monorepo specifically: it uses **pnpm**, whose content-
addressed store hard-links dependencies, so `pnpm install` in a fresh worktree is
fast and disk-cheap — parallel worktrees there are very practical.

---

## 8. Handling merge conflicts

When two branches change the **same lines**, the second to integrate hits a
conflict during rebase:

```bash
cd .worktrees/fix-date-bug
git fetch origin
git rebase origin/main
# CONFLICT in src/somefile.ts
```

Resolve it:

```bash
# 1. Open the conflicted file, find the markers:
#    <<<<<<< HEAD            (changes already on main)
#    =======
#    >>>>>>> your-commit     (your changes)
#    Edit to the correct combined result, delete the markers.

# 2. Stage the resolved file
git add src/somefile.ts

# 3. Continue the rebase
git rebase --continue

# Bail out if it goes wrong:
git rebase --abort
```

After a successful rebase, run tests again and `git push --force-with-lease` to
update the PR. **Designing tasks to touch different files (as this repo does) is
the best way to avoid conflicts entirely.**

---

## 9. Best practices

- **One branch per worktree, named for the task** — `fix/pricing-bug`,
  `feat/add-export` (kebab-case, `<type>/<description>`).
- **Branch off `origin/main`, not local `main`** — start from the latest.
- **Keep worktrees in `.worktrees/` and git-ignore that folder.**
- **Each worktree gets its own `.env` / port** — no `EADDRINUSE`.
- **Run dependency install in each new worktree** (`node_modules` is per-folder).
- **Verify green tests in each worktree before committing.**
- **Rebase the second branch onto main after the first merges.**
- **Remove worktrees and delete branches when merged** — avoid stale clutter.
- **Use `--force-with-lease`, never `--force`.**

---

## 10. Common pitfalls

| Pitfall | Fix |
|---------|-----|
| `EADDRINUSE` on second dev server | Per-worktree `PORT` via `.env` (Section 4) |
| Committed `node_modules`/worktree folders | Git-ignore `.worktrees/`, `node_modules/`, `.env` |
| "branch already checked out" error | A branch lives in only one worktree — pick another branch |
| Nesting a worktree inside another | Always create worktrees as siblings under `.worktrees/` |
| Deleted a worktree folder by hand | Run `git worktree prune` to clean metadata |
| Shared DB corrupted by two servers | One DB/container per worktree |
| Diverged branches, messy merge | `fetch` + `rebase origin/main` before the 2nd merge |
| Force-push clobbered a teammate | Use `--force-with-lease` |
| GitHub "Add files via upload" skips folders/dotfiles | Push with `git push`, not the web drag-and-drop UI |

---

## 11. Quick reference

```bash
git worktree list                                  # show all worktrees
git fetch origin                                   # get latest
git worktree add .worktrees/x -b fix/x origin/main # new worktree off main
echo "PORT=3001" > .worktrees/x/.env               # isolate the port
cd .worktrees/x && npm install && npm test         # set up + verify
git commit -am "fix: ..."                          # commit work
git push -u origin fix/x && gh pr create --fill    # push + PR
git fetch origin && git rebase origin/main         # "sync" / integrate
git push --force-with-lease                        # update PR after rebase
git worktree remove .worktrees/x                   # clean up worktree
git branch -d fix/x                                # delete merged branch
git worktree prune                                 # tidy stale metadata
```
