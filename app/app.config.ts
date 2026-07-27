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

        button: {
            defaultVariants: {
                color: 'neutral',
            },
        },

        // @nuxt/ui v3 theme overrides: class strings go under `slots`, keyed by
        // real slot names. (Previously flat base/focus/background keys, which the
        // type system rejects and the runtime silently ignored.)
        card: {
            slots: {
                root: 'bg-[var(--charcoal)] border-[var(--grey-600)] text-[var(--bone)]',
                header: 'text-[var(--bone)]',
                body: 'text-[var(--grey-400)]',
            },
        },

        slideover: {
            slots: {
                overlay: 'bg-black/60',
                content: 'bg-[var(--charcoal)] text-[var(--bone)]',
                header: 'border-b-[var(--grey-600)]',
                footer: 'border-t-[var(--grey-600)]',
                close: 'text-[var(--grey-400)] hover:text-[var(--bone)]',
            },
        },

        modal: {
            slots: {
                overlay: 'bg-black/60',
                content: 'bg-[var(--charcoal)] text-[var(--bone)]',
                header: 'border-b-[var(--grey-600)] text-[var(--bone)]',
                footer: 'border-t-[var(--grey-600)]',
                close: 'text-[var(--grey-400)] hover:text-[var(--bone)]',
            },
        },

        formField: {
            slots: {
                label: 'text-[var(--grey-400)] text-[var(--text-xs)]',
            },
        },

        input: {
            slots: {
                base: 'bg-[var(--ink-black)] border-[var(--grey-600)] text-[var(--bone)] placeholder:text-[var(--grey-500)] focus:border-[var(--bone)]',
            },
        },

        inputNumber: {
            slots: {
                base: 'bg-[var(--ink-black)] border-[var(--grey-600)] text-[var(--bone)] focus:border-[var(--bone)]',
            },
        },

        select: {
            slots: {
                base: 'bg-[var(--ink-black)] border-[var(--grey-600)] text-[var(--bone)] focus:border-[var(--bone)]',
            },
        },
    },
})
