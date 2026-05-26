{
  description = "STITCH AND ASH preview site — Astro 5 + Cloudflare Pages";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodePackages = with pkgs; [
          nodejs_22
          pnpm
        ];
        shopifyTools = with pkgs; [
          curl
          git
          jq
          sops
          yq-go
        ];
        catalogRunner =
          mode:
          pkgs.writeShellApplication {
            name = "shopify-catalog-${mode}";
            runtimeInputs = nodePackages ++ shopifyTools;
            text = ''
              set -euo pipefail

              ROOT_DIR=$(git rev-parse --show-toplevel)
              NIXLAB_DIR="''${NIXLAB_DIR:-$ROOT_DIR/../nixlab}"
              SHOPIFY_SECRET_FILE="''${SHOPIFY_SECRET_FILE:-$NIXLAB_DIR/secrets/shopify.yaml}"

              # shellcheck disable=SC2050
              if [ "${mode}" = "validate" ]; then
                cd "$ROOT_DIR"
                pnpm install --frozen-lockfile
                pnpm catalog:validate
                exit 0
              fi

              if [ ! -f "$SHOPIFY_SECRET_FILE" ]; then
                echo "ERROR: Shopify SOPS secret not found at $SHOPIFY_SECRET_FILE" >&2
                echo "Set SHOPIFY_SECRET_FILE=/path/to/shopify.yaml or NIXLAB_DIR=/path/to/nixlab." >&2
                exit 1
              fi

              SHOPIFY_CLIENT_ID=$(sops -d "$SHOPIFY_SECRET_FILE" | yq -r '.SHOPIFY_CLIENT_ID // ""')
              SHOPIFY_CLIENT_SECRET=$(sops -d "$SHOPIFY_SECRET_FILE" | yq -r '.SHOPIFY_CLIENT_SECRET // ""')
              SHOPIFY_STORE_DOMAIN="''${SHOPIFY_STORE_DOMAIN:-stitch-and-ash.myshopify.com}"

              if [ -z "$SHOPIFY_CLIENT_ID" ] || [ -z "$SHOPIFY_CLIENT_SECRET" ]; then
                echo "ERROR: SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET missing in $SHOPIFY_SECRET_FILE" >&2
                exit 1
              fi

              TOKEN_RESPONSE=$(curl --fail-with-body --silent --show-error \
                --request POST \
                --header 'Content-Type: application/json' \
                --data "$(jq -nc \
                  --arg client_id "$SHOPIFY_CLIENT_ID" \
                  --arg client_secret "$SHOPIFY_CLIENT_SECRET" \
                  '{client_id: $client_id, client_secret: $client_secret, grant_type: "client_credentials"}')" \
                "https://$SHOPIFY_STORE_DOMAIN/admin/oauth/access_token")

              export SHOPIFY_ADMIN_ACCESS_TOKEN
              SHOPIFY_ADMIN_ACCESS_TOKEN=$(printf '%s' "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
              export SHOPIFY_ADMIN_STORE_DOMAIN="$SHOPIFY_STORE_DOMAIN"

              if [ -z "$SHOPIFY_ADMIN_ACCESS_TOKEN" ]; then
                echo "ERROR: Shopify token endpoint returned no access_token" >&2
                exit 1
              fi

              cd "$ROOT_DIR"
              pnpm install --frozen-lockfile
              pnpm catalog:${mode}
            '';
          };
        shopifyEnv = pkgs.writeShellApplication {
          name = "shopify-env";
          runtimeInputs = nodePackages ++ shopifyTools;
          text = ''
            set -euo pipefail
            ROOT_DIR=$(git rev-parse --show-toplevel)
            cd "$ROOT_DIR"
            pnpm install --frozen-lockfile
            pnpm shopify:doctor "$@"
          '';
        };
        buildPages = pkgs.writeShellApplication {
          name = "build-pages";
          runtimeInputs = nodePackages;
          text = ''
            set -euo pipefail
            ROOT_DIR=$(git rev-parse --show-toplevel)
            cd "$ROOT_DIR"
            pnpm install --frozen-lockfile
            pnpm build
          '';
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = nodePackages ++ shopifyTools;

          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"
            echo "STITCH AND ASH dev shell ready"
            echo "  node: $(node --version)"
            echo "  pnpm: $(pnpm --version)"
            echo "  wrangler: $(wrangler --version 2>/dev/null || echo 'run pnpm install first')"
          '';
        };

        apps = {
          catalog-validate = {
            type = "app";
            program = "${catalogRunner "validate"}/bin/shopify-catalog-validate";
          };
          catalog-plan = {
            type = "app";
            program = "${catalogRunner "plan"}/bin/shopify-catalog-plan";
          };
          catalog-apply = {
            type = "app";
            program = "${catalogRunner "apply"}/bin/shopify-catalog-apply";
          };
          shopify-doctor = {
            type = "app";
            program = "${shopifyEnv}/bin/shopify-env";
          };
          tracking-plan = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "shopify-tracking-plan";
              runtimeInputs = nodePackages ++ shopifyTools;
              text = ''
                set -euo pipefail
                ROOT_DIR=$(git rev-parse --show-toplevel)
                NIXLAB_DIR="''${NIXLAB_DIR:-$ROOT_DIR/../nixlab}"
                SHOPIFY_SECRET_FILE="''${SHOPIFY_SECRET_FILE:-$NIXLAB_DIR/secrets/shopify.yaml}"

                if [ ! -f "$SHOPIFY_SECRET_FILE" ]; then
                  echo "ERROR: Shopify SOPS secret not found at $SHOPIFY_SECRET_FILE" >&2
                  exit 1
                fi

                SHOPIFY_CLIENT_ID=$(sops -d "$SHOPIFY_SECRET_FILE" | yq -r '.SHOPIFY_CLIENT_ID // ""')
                SHOPIFY_CLIENT_SECRET=$(sops -d "$SHOPIFY_SECRET_FILE" | yq -r '.SHOPIFY_CLIENT_SECRET // ""')
                SHOPIFY_STORE_DOMAIN="''${SHOPIFY_STORE_DOMAIN:-stitch-and-ash.myshopify.com}"

                TOKEN_RESPONSE=$(curl --fail-with-body --silent --show-error \
                  --request POST \
                  --header 'Content-Type: application/json' \
                  --data "$(jq -nc --arg client_id "$SHOPIFY_CLIENT_ID" --arg client_secret "$SHOPIFY_CLIENT_SECRET" '{client_id: $client_id, client_secret: $client_secret, grant_type: "client_credentials"}')" \
                  "https://$SHOPIFY_STORE_DOMAIN/admin/oauth/access_token")

                SHOPIFY_ADMIN_ACCESS_TOKEN=$(printf '%s' "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
                export SHOPIFY_ADMIN_ACCESS_TOKEN
                export SHOPIFY_ADMIN_STORE_DOMAIN="$SHOPIFY_STORE_DOMAIN"

                cd "$ROOT_DIR"
                pnpm install --frozen-lockfile
                pnpm tracking:plan "$@"
              '';
            }}/bin/shopify-tracking-plan";
          };
          tracking-apply = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "shopify-tracking-apply";
              runtimeInputs = nodePackages ++ shopifyTools;
              text = ''
                set -euo pipefail
                ROOT_DIR=$(git rev-parse --show-toplevel)
                NIXLAB_DIR="''${NIXLAB_DIR:-$ROOT_DIR/../nixlab}"
                SHOPIFY_SECRET_FILE="''${SHOPIFY_SECRET_FILE:-$NIXLAB_DIR/secrets/shopify.yaml}"

                if [ ! -f "$SHOPIFY_SECRET_FILE" ]; then
                  echo "ERROR: Shopify SOPS secret not found at $SHOPIFY_SECRET_FILE" >&2
                  exit 1
                fi

                SHOPIFY_CLIENT_ID=$(sops -d "$SHOPIFY_SECRET_FILE" | yq -r '.SHOPIFY_CLIENT_ID // ""')
                SHOPIFY_CLIENT_SECRET=$(sops -d "$SHOPIFY_SECRET_FILE" | yq -r '.SHOPIFY_CLIENT_SECRET // ""')
                SHOPIFY_STORE_DOMAIN="''${SHOPIFY_STORE_DOMAIN:-stitch-and-ash.myshopify.com}"

                TOKEN_RESPONSE=$(curl --fail-with-body --silent --show-error \
                  --request POST \
                  --header 'Content-Type: application/json' \
                  --data "$(jq -nc --arg client_id "$SHOPIFY_CLIENT_ID" --arg client_secret "$SHOPIFY_CLIENT_SECRET" '{client_id: $client_id, client_secret: $client_secret, grant_type: "client_credentials"}')" \
                  "https://$SHOPIFY_STORE_DOMAIN/admin/oauth/access_token")

                SHOPIFY_ADMIN_ACCESS_TOKEN=$(printf '%s' "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
                export SHOPIFY_ADMIN_ACCESS_TOKEN
                export SHOPIFY_ADMIN_STORE_DOMAIN="$SHOPIFY_STORE_DOMAIN"

                cd "$ROOT_DIR"
                pnpm install --frozen-lockfile
                pnpm tracking:apply "$@"
              '';
            }}/bin/shopify-tracking-apply";
          };
          build-hydrogen = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "build-hydrogen";
              runtimeInputs = nodePackages;
              text = ''
                set -euo pipefail
                ROOT_DIR=$(git rev-parse --show-toplevel)
                cd "$ROOT_DIR/hydrogen"
                nix run github:nixos/nixpkgs/nixos-unstable#pnpm -- install --no-frozen-lockfile
                nix run github:nixos/nixpkgs/nixos-unstable#pnpm -- exec react-router typegen
                nix run github:nixos/nixpkgs/nixos-unstable#pnpm -- run typecheck
                nix run github:nixos/nixpkgs/nixos-unstable#pnpm -- run build
              '';
            }}/bin/build-hydrogen";
          };
          build-pages = {
            type = "app";
            program = "${buildPages}/bin/build-pages";
          };
        };

        formatter = pkgs.nixfmt-rfc-style;

        checks = {
          catalog-validate = pkgs.runCommand "catalog-validate" { nativeBuildInputs = [ pkgs.nodejs_22 ]; } ''
            cp -r ${self} repo
            chmod -R +w repo
            cd repo
            ${pkgs.pnpm}/bin/pnpm install --frozen-lockfile --ignore-scripts
            ${pkgs.pnpm}/bin/pnpm catalog:validate
            touch $out
          '';
        };
      }
    );
}
