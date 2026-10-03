export default defineAppConfig({
    shopify: {
        shopName: 'STITCH AND ASH',

        collection: {
            perPage: 12,
        },
    },

    ui: {
        colors: {
            primary: 'neutral',
            neutral: 'slate',
        },

        // The vendor semantic ramp itself is re-pointed at the DESIGN.md
        // tokens in app/assets/css/tokens.css ("Vendor semantic bridge").
        // These keys cover what is left: geometry and depth.
        //
        // @nuxt/ui v4 theme overrides: class strings go under `slots`, keyed by
        // real slot names. (Previously flat base/focus/background keys, which the
        // type system rejects and the runtime silently ignores.)
        //
        // DESIGN.md has no elevation: the one allowed depth is a 1px hairline.
        // Every `shadow-lg` / `ring ring-default` the vendor ships on a
        // panel, card or toast is therefore killed here, and the `sm:` twins
        // are named too — Tailwind treats `shadow-lg` and `sm:shadow-lg` as
        // different declarations, so dropping the modifier leaves the
        // vendor's desktop shadow in place.
        // `root` is the real slot name for the card's plate — the vendor theme
        // keys it `root` (see the generated `.nuxt/ui/card.ts`), not `base`.
        card: {
            slots: {
                root: 'bg-[var(--charcoal)] border-[var(--border-rule)] text-[var(--bone)] rounded-none shadow-none ring-0 sm:shadow-none sm:ring-0',
                header: 'text-[var(--bone)]',
                title: 'text-[var(--bone)] font-medium',
                body: 'text-[var(--grey-400)]',
            },
        },

        slideover: {
            slots: {
                overlay: 'bg-black/60',
                content: 'bg-[var(--charcoal)] text-[var(--bone)] rounded-none shadow-none ring-0 sm:shadow-none sm:ring-0',
                header: 'border-b border-[var(--border-rule)]',
                body: 'bg-[var(--charcoal)]',
                footer: 'border-t border-[var(--border-rule)] bg-[var(--charcoal)]',
                close: 'text-[var(--grey-400)] hover:text-[var(--bone)] size-11 flex items-center justify-center',
            },
        },

        modal: {
            slots: {
                overlay: 'bg-black/60',
                content: 'bg-[var(--charcoal)] text-[var(--bone)] rounded-none shadow-none ring-0 sm:shadow-none sm:ring-0',
                header: 'border-b border-[var(--border-rule)] text-[var(--bone)]',
                body: 'bg-[var(--charcoal)]',
                footer: 'border-t border-[var(--border-rule)] bg-[var(--charcoal)]',
                close: 'text-[var(--grey-400)] hover:text-[var(--bone)] size-11 flex items-center justify-center',
            },
        },

        formField: {
            slots: {
                label: 'text-[var(--grey-400)] text-[length:var(--text-xs)]',
            },
        },

        input: {
            slots: {
                base: 'bg-[var(--ink-black)] border-[var(--outline)] text-[var(--bone)] placeholder:text-[var(--grey-400)] focus:border-[var(--bone)] rounded-none shadow-none ring-0 focus-visible:ring-0',
            },
        },

        inputNumber: {
            slots: {
                base: 'bg-[var(--ink-black)] border-[var(--outline)] text-[var(--bone)] focus:border-[var(--bone)] rounded-none shadow-none ring-0 focus-visible:ring-0',
            },
        },

        select: {
            slots: {
                base: 'bg-[var(--ink-black)] border-[var(--outline)] text-[var(--bone)] focus:border-[var(--bone)] rounded-none shadow-none ring-0 focus-visible:ring-0',
            },
        },

        // The toast is the one @nuxt/ui surface the storefront cannot scope to a
        // panel, so it is themed globally here: charcoal plate, bone text, the
        // 1px --rule boundary, and no elevation. The `progress` slot is the
        // vendor's colour-coded countdown bar, which is colour-as-state; it is
        // left in the layout but repainted on the border-rule step so it reads
        // as a hairline rather than a status colour. `color: 'neutral'` in
        // cart.ts is neutralised by the same rule the neutral ramp feeds.
        toast: {
            slots: {
                root: 'bg-[var(--charcoal)] text-[var(--bone)] border border-[var(--border-rule)] rounded-none shadow-none ring-0 sm:shadow-none sm:ring-0',
                title: 'text-[var(--bone)]',
                description: 'text-[var(--grey-400)]',
                icon: 'text-[var(--bone)]',
                avatar: 'rounded-none',
                actions: 'text-[var(--bone)]',
                progress: 'bg-[var(--border-rule)]',
                close: 'text-[var(--grey-400)] hover:text-[var(--bone)]',
            },
            variants: {
                color: {
                    // Whatever colour the caller asks for, the icon and the
                    // focus ring stay on the achromatic ramp.
                    neutral: {
                        root: 'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--bone)]',
                        icon: 'text-[var(--bone)]',
                    },
                    primary: {
                        root: 'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--bone)]',
                        icon: 'text-[var(--bone)]',
                    },
                },
            },
        },
    },
})