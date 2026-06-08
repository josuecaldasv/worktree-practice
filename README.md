# worktree-practice

A tiny Express + TypeScript app for **practicing git worktrees with Claude Code**.

The app is a small HTTP server with **two intentional bugs**, each in its own
file and each pinned by a failing test. The exercise is to fix both bugs **in
parallel**, each in its own git worktree — exactly how you'd handle two real
bugs at once.

> 📖 Full conceptual guide: **[docs/WORKTREES-GUIDE.md](docs/WORKTREES-GUIDE.md)**

## Setup

```bash
npm install
npm test        # 🔴 you'll see Bug A and Bug B failing — that's expected
npm run dev     # starts http://localhost:3000
```

Try it:

```bash
curl "http://localhost:3000/health"
curl "http://localhost:3000/price?price=100&percentOff=20"   # should be 80, not 2000
```

## The two bugs

| Bug | File | Symptom | Test |
|-----|------|---------|------|
| **A** | `src/pricing.ts` | `applyDiscount(100, 20)` returns `2000` instead of `80` | `src/pricing.test.ts` |
| **B** | `src/dateFormat.ts` | `formatDate` is off by one month (`getMonth()` is zero-indexed) | `src/dateFormat.test.ts` |

They live in **separate files**, so two worktrees can fix them at the same time
with zero merge conflicts.

## The parallel exercise

```bash
# 0. Start from the latest main
git fetch origin

# 1. Create one worktree per bug, each on its own branch off main
git worktree add .worktrees/fix-pricing-bug -b fix/pricing-bug
git worktree add .worktrees/fix-date-bug    -b fix/date-bug

# 2. Give each worktree its own port so dev servers don't collide
echo "PORT=3000" > .worktrees/fix-pricing-bug/.env
echo "PORT=3001" > .worktrees/fix-date-bug/.env

# 3. In two terminals (or two Claude sessions), one per folder:
cd .worktrees/fix-pricing-bug && npm install && npm test   # fix Bug A
cd .worktrees/fix-date-bug    && npm install && npm test   # fix Bug B

# 4. Commit + push each branch, open a PR each
git push -u origin fix/pricing-bug   # from worktree A
git push -u origin fix/date-bug      # from worktree B

# 5. Merge PR #1. Then rebase PR #2 onto the new main before merging:
cd .worktrees/fix-date-bug && git fetch origin && git rebase origin/main

# 6. Clean up when merged
git worktree remove .worktrees/fix-pricing-bug
git worktree remove .worktrees/fix-date-bug
```

When both bugs are fixed, `npm test` is fully green. 🟢

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the server with hot reload (`tsx watch`) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
