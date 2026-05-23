# Branch Protection Setup

Run these commands **once** from your local machine after the bootstrap PR merges.
You need admin access on the repo (olive or owner role).

```bash
# 1. Enable auto-merge at the repo level (required for gh pr merge --auto to work)
gh api -X PATCH /repos/olivecasazza/stitch-ash \
  -f allow_auto_merge=true

# 2. Set branch protection on main
gh api -X PUT /repos/olivecasazza/stitch-ash/branches/main/protection \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "typecheck-and-build",
      "wait-and-check",
      "label"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false
}
EOF
```

> **Status check names** must match the job names in the workflows exactly:
> - `typecheck-and-build` — from `pr-checks.yml`
> - `wait-and-check` — from `preview-gate.yml`
> - `label` — from `semver-label.yml`
>
> If you rename the jobs, update the `contexts` array above.

After running the commands:

```bash
# Verify protection is in place
gh api /repos/olivecasazza/stitch-ash/branches/main/protection | \
  jq '{required_status_checks: .required_status_checks.contexts, linear_history: .required_linear_history, force_pushes: .allow_force_pushes}'
```
