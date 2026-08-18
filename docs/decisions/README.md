# Decisions

This directory holds Architecture Decision Records (ADRs) for STITCH AND ASH.
Each record captures one decision worth keeping: the context, the decision, the
alternatives weighed, and the consequences. ADRs are immutable once accepted;
supersede by writing a new ADR that links to the old one.

When a decision previously lived on a customer-facing surface (e.g. an
internal AI recommendation that ended up published as a `/pages/...` route),
the right move is to delete the customer-facing copy and capture the reasoning
here.

## Index

- [2026-07-21 — Shopify as system of record](2026-07-21-shopify-as-system-of-record.md)

## Conventions

- Filename: `YYYY-MM-DD-short-slug.md`.
- Sections in this order: Title, Status, Context, Decision, Alternatives
  considered, Consequences, Related.
- "Related" links to the Paperclip issue ids and any supporting docs.
- Decisions are not blog posts. One paragraph per alternative is enough.
