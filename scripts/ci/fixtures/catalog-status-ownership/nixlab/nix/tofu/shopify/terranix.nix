# scripts/ci/fixtures/catalog-status-ownership/nixlab/nix/tofu/shopify/terranix.nix
#
# A FROZEN, REDUCED COPY of the nixlab Shopify terranix, checked in so that
# `catalog-status-ownership-gate.test.sh` can assert the cross-repo conflict
# hermetically. STI-569.
#
# ── Why this file exists ───────────────────────────────────────────────────
#
# The gate that owns the "one owner per product status" invariant compares this
# repo's catalog/products/*.yaml against an adjacent nixlab tree. That tree is
# not in this repo, so on a GitHub runner it does not exist, the gate honestly
# reports `SKIPPED (not a pass)`, exits 0, and the test that asserted "a
# conflicting terranix must fail the gate" failed for a reason that had nothing
# to do with the gate. The suite was hardcoded to one agent host's absolute
# path, so it was red on every PR from the machine that ran the job and
# unrunnable anywhere else — a permanently red job, which is the same as no job.
#
# So the conflict shape is now a file in this repo, next to the assertion about
# it. The test points NIXLAB_DIR at this fixture directory and the assertion
# becomes reproducible on any machine, including a fresh clone.
#
# ── What is frozen here, and why it must stay conflicting ──────────────────
#
# The values below are the hazard as measured on 2026-09-28/29:
#
#   catalog/products/sku-00N.yaml   status: ACTIVE    inventoryPolicy: CONTINUE
#   this terranix                   status = "draft" inventory_policy = "deny"
#
# Two things are wrong at once, and that is the point. `status = "draft"` would
# de-list three live ACTIVE products on the next `nix run .#deploy-shopify`,
# because the restapi_object resources use update_method = "PUT". And
# `inventory_policy = "deny"` would block checkout on every variant, because all
# seven sit at or below zero inventory.
#
# Do NOT "fix" this file by making it agree with catalog/products. This is not
# the live nixlab declaration and it is not a proposal to resolve the
# conflict. The live conflict lives in the nixlab repo, where the gate's real
# cross-repo run still reads it; see
# docs/decisions/2026-09-28-catalog-source-of-truth.md (STI-538) for the
# single-owner decision. This fixture exists to prove the gate DETECTS the
# shape. If it stops conflicting, the test that depends on it is asserting
# nothing, and the cheapest way to turn a safety gate green is exactly the kind
# of edit this file's shape is meant to make suspicious.
#
# Reduced on purpose: the real module carries Shopify REST path helpers, remote
# GCS state, body_html copy and five variants per product. None of that is read
# by the gate, and none of it belongs in a repo that does not own it. What the
# gate parses is the restapi_object product blocks' handle, status and the
# inventory_policy aggregate across a block's variants.

{ ... }:
let
  vendor = "STITCH AND ASH";
  tags = "embroidered,black-on-black,made-to-order";
in
{
  terraform = {
    required_providers = {
      restapi = {
        source = "Mastercard/restapi";
        version = "~> 1.18.0";
      };
    };
  };

  variable.SHOPIFY_ADMIN_TOKEN = {
    type = "string";
    sensitive = true;
  };

  resource.restapi_object = {

    # All products declared as drafts, publish via Shopify Admin when ready.
    # The gate's job is to refuse to let this file and catalog/products both
    # claim to own the same handle.

    product_hoodie = {
      path = "/products.json";
      update_method = "PUT";
      id_attribute = "product/id";
      lifecycle.prevent_destroy = true;
      data = builtins.toJSON {
        product = {
          title = "Embroidered Hoodie";
          handle = "sku-001";
          inherit vendor tags;
          product_type = "Hoodies";
          status = "draft";
          options = [ { name = "Size"; } ];
          variants = [
            {
              option1 = "S";
              price = "185.00";
              sku = "sku-001-S";
              inventory_management = "shopify";
              inventory_policy = "deny";
            }
            {
              option1 = "M";
              price = "185.00";
              sku = "sku-001-M";
              inventory_management = "shopify";
              inventory_policy = "deny";
            }
          ];
        };
      };
    };

    product_lanyard = {
      path = "/products.json";
      update_method = "PUT";
      id_attribute = "product/id";
      lifecycle.prevent_destroy = true;
      data = builtins.toJSON {
        product = {
          title = "Woven Lanyard";
          handle = "sku-002";
          inherit vendor tags;
          product_type = "Accessories";
          status = "draft";
          options = [ { name = "Size"; } ];
          variants = [
            {
              option1 = "OS";
              price = "22.00";
              sku = "sku-002-OS";
              inventory_management = "shopify";
              inventory_policy = "deny";
            }
          ];
        };
      };
    };

    product_sticker = {
      path = "/products.json";
      update_method = "PUT";
      id_attribute = "product/id";
      lifecycle.prevent_destroy = true;
      data = builtins.toJSON {
        product = {
          title = "Logo Sticker";
          handle = "sku-003";
          inherit vendor tags;
          product_type = "Accessories";
          status = "draft";
          options = [ { name = "Size"; } ];
          variants = [
            {
              option1 = "OS";
              price = "6.00";
              sku = "sku-003-OS";
              inventory_management = "shopify";
              inventory_policy = "deny";
            }
          ];
        };
      };
    };
  };
}
