# Deployment and branch governance

GitHub Pages publishes this preview from the `main` branch. Changes reach
`main` only through pull requests; direct and force pushes are not part of the
release workflow.

## One-time repository setting

After this document is merged, configure a branch protection rule or ruleset
for `main` with these minimum controls:

- Require a pull request before merging.
- Require the status check **`Full suite (18 checks)`**.
- Require branches to be up to date before merging.
- Do not allow force pushes.
- Do not allow branch deletion.
- Apply the rule to administrators unless a documented emergency requires a
  temporary exception.

`Full suite (18 checks)` is the `verify` job in `.github/workflows/ci.yml`.
The workflow runs on pull requests targeting `main` and again after a merge is
pushed to `main`. GitHub Pages checks such as `build` and `deploy` occur after
the merge; they verify deployment and are not substitutes for the pre-merge
CI requirement.

## One-time workstation migration

The legacy `git ship` alias is stored in each user's global Git configuration,
not in this repository. Remove it on every existing development machine:

```powershell
git config --global --unset-all alias.ship
```

Verify that it is gone; this command should print nothing:

```powershell
git config --global --get-all alias.ship
```

The repository hook blocks the alias today, but removing the global command
eliminates the obsolete force-push footgun instead of relying on that fallback.

## Start a change

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c <owner>/<short-description>
```

Activate the repository hooks once in each fresh clone:

```powershell
git config core.hooksPath tools/hooks
```

Make the change, run the relevant local checks, and inspect the exact diff.
When mattress CSV data changes, run `./build-data.ps1` and commit the generated
JSON with its source CSV.

## Publish for review

```powershell
git add <intended-files>
git commit -m "short description"
git push -u origin HEAD
gh pr create --base main --draft
```

Do not use `git push origin main`, `--force`, or the legacy `git ship` alias.
The versioned pre-push hook blocks direct pushes to `main`; branch protection
provides the server-side enforcement.

Before merging:

1. Review the complete PR diff.
2. Confirm `Full suite (18 checks)` passed on the latest head commit.
3. Resolve requested changes and rerun the check.
4. Mark the PR ready and merge it using an allowed GitHub merge method.

## Verify deployment

After merge:

1. Record the resulting `main` commit SHA.
2. Confirm the `Full suite (18 checks)` push run succeeds on that SHA.
3. Confirm the GitHub Pages `build` and `deploy` checks succeed on that SHA.
4. Open <https://beford782.github.io/LacksFurniture/> and perform the relevant
   smoke test.
5. Report branch publication, PR merge, and Pages deployment as three separate
   states. A branch push alone is never “live.”

## Recovery

Do not rewrite `main` to undo a bad release. Create a new branch from the
current `main`, revert the offending commit or merge commit, run CI, and merge
the recovery PR. This preserves the audit trail and keeps branch protection
intact.

If GitHub itself prevents the normal PR path during a true emergency, the
repository owner must explicitly approve and document any temporary protection
change, restore protection immediately afterward, and follow with a normal PR
that records the final state. A local alias is not an emergency procedure.
