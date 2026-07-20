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

        card: {
            base: 'bg-[var(--charcoal)] border-[var(--grey-600)] text-[var(--bone)]',
            divide: 'divide-[var(--grey-600)]',
            header: 'text-[var(--bone)]',
            body: 'text-[var(--grey-400)]',
        },

        slideover: {
            base: 'bg-[var(--charcoal)] text-[var(--bone)]',
            background: 'bg-black/60',
            header: 'border-b-[var(--grey-600)]',
            footer: 'border-t-[var(--grey-600)]',
            close: 'text-[var(--grey-400)] hover:text-[var(--bone)]',
        },

        modal: {
            base: 'bg-[var(--charcoal)] text-[var(--bone)]',
            background: 'bg-black/60',
            header: 'border-b-[var(--grey-600)] text-[var(--bone)]',
            footer: 'border-t-[var(--grey-600)]',
            close: 'text-[var(--grey-400)] hover:text-[var(--bone)]',
        },

        formField: {
            label: 'text-[var(--grey-400)] text-[var(--text-xs)]',
        },

        input: {
            base: 'bg-[var(--ink-black)] border-[var(--grey-600)] text-[var(--bone)] placeholder:text-[var(--grey-500)]',
            focus: 'border-[var(--bone)] ring-1 ring-[var(--bone)]',
        },

        inputNumber: {
            base: 'bg-[var(--ink-black)] border-[var(--grey-600)] text-[var(--bone)]',
            focus: 'border-[var(--bone)] ring-1 ring-[var(--bone)]',
        },

        select: {
            base: 'bg-[var(--ink-black)] border-[var(--grey-600)] text-[var(--bone)]',
            focus: 'border-[var(--bone)] ring-1 ring-[var(--bone)]',
        },

        textarea: {
            base: 'bg-[var(--ink-black)] border-[var(--grey-600)] text-[var(--bone)] placeholder:text-[var(--grey-500)]',
            focus: 'border-[var(--bone)] ring-1 ring-[var(--bone)]',
        },
    },
})
