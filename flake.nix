{
  description = "STITCH AND ASH preview site — Astro 5 + Cloudflare Pages";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.pnpm
            # wrangler is installed via pnpm (see package.json devDependencies)
            # to avoid nixpkgs version drift with CF releases
          ];

          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"
            echo "STITCH AND ASH dev shell ready"
            echo "  node: $(node --version)"
            echo "  pnpm: $(pnpm --version)"
            echo "  wrangler: $(wrangler --version 2>/dev/null || echo 'run pnpm install first')"
          '';
        };

        checks = {
          # Validate flake structure
          flake-check = pkgs.runCommand "flake-check" {} ''
            echo "flake structure OK" > $out
          '';
        };
      });
}
