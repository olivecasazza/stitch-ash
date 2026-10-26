# Nix catalog validation

The `checks.<system>.catalog-validate` flake check runs the same `pnpm catalog:validate` command used by the Shopify catalog wrapper, but its dependency installation is hermetic:

- `pnpm-lock.yaml` is fetched into a fixed-output Nix dependency closure with `fetchPnpmDeps` (fetcher version 3).
- `pnpmConfigHook` installs from that closure with `--offline --frozen-lockfile --ignore-scripts` during the Nix build.
- The validator runs only after the pinned dependency closure is installed; it never executes `pnpm install` against the network in the check sandbox.
- The check is a real catalog validator and produces its output only after the command exits successfully. It does not add a synthetic or no-op check.

The existing Shopify-connected plan/apply wrappers remain unchanged and retain their credential and human-approval boundaries. The hermetic check validates repository catalog inputs only; it does not read Shopify credentials or call the Admin API.
