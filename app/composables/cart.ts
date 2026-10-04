import type { CartFieldsFragment, CartLineFieldsFragment } from '#shopify/storefront'

// What the open panel keeps of a removed line so it can be put back. `after`
// is the id of the row directly above it when it was removed (null: it was
// the top row) — the undo row is anchored to its neighbour rather than to an
// index, so it keeps its slot while other rows come and go around it.
export interface RemovedCartLine {
    lineId: string
    merchandiseId: string
    quantity: number
    title: string
    options: NonNullable<CartLineFieldsFragment['merchandise']['selectedOptions']>
    after: string | null
    undoing: boolean
}

export type CartRow =
    | { id: string, line: CartLineFieldsFragment, removed?: undefined }
    | { id: string, line?: undefined, removed: RemovedCartLine }

export const useCart = () => {
    const { language, country } = useLocalization()
    const storefront = useStorefront()
    const toast = useToast()
    const { t } = useI18n()

    const cart = useState<CartFieldsFragment | undefined>('shopify-cart', () => undefined)
    const loading = useState('shopify-cart-loading', () => ref(false))
    const open = useState('shopify-cart-open', () => ref(false))
    const recentlyRemoved = useState<RemovedCartLine[]>('shopify-cart-removed', () => [])

    const id = useCookie<string>('shopify-cart-id', undefined)

    const lines = computed(() => flattenConnection(cart.value?.lines))
    const checkoutUrl = computed(() => cart.value?.checkoutUrl)
    const quantity = computed(() => cart.value?.totalQuantity)
    const subtotal = computed(() => cart.value?.cost.subtotalAmount)

    // The panel's list: the cart's lines with each pending undo row spliced in
    // under the row it sat beneath. A row whose anchor is itself a pending undo
    // row waits until that one is placed; an anchor that has left the list
    // entirely sends the row to the end.
    const rows = computed<CartRow[]>(() => {
        const result: CartRow[] = lines.value.map(line => ({ id: line.id, line }))
        let pending = recentlyRemoved.value

        while (pending.length > 0) {
            const placeable = pending.filter(removed => removed.after === null || result.some(row => row.id === removed.after))

            if (placeable.length === 0) break

            for (const removed of placeable) {
                const anchor = result.findIndex(row => row.id === removed.after)

                result.splice(anchor + 1, 0, { id: removed.lineId, removed })
            }

            pending = pending.filter(removed => !placeable.includes(removed))
        }

        return result.concat(pending.map(removed => ({ id: removed.lineId, removed })))
    })

    // Drops an undo row. Rows anchored beneath it inherit its anchor, so they
    // stay where they are instead of falling to the end of the list.
    const dismissRemoved = (lineId: string) => {
        const dismissed = recentlyRemoved.value.find(removed => removed.lineId === lineId)

        if (!dismissed) return

        for (const removed of recentlyRemoved.value) {
            if (removed.after === lineId) removed.after = dismissed.after
        }

        recentlyRemoved.value = recentlyRemoved.value.filter(removed => removed !== dismissed)
    }

    const clearRemoved = () => {
        recentlyRemoved.value = []
    }

    const setLoading = async (value: boolean) => loading.value = value

    const getAvatar = (variantId: string, lines?: CartFieldsFragment['lines']) => {
        const line = lines?.edges?.find(line => line.node.merchandise.id === variantId)

        return line?.node.merchandise.image
            ? {
                    src: line.node.merchandise.image.url + '?width=88&height=88',
                    alt: line.node.merchandise.image.altText || undefined,
                }
            : undefined
    }

    const init = (): Promise<unknown> => setLoading(true).then(() => storefront.request(`#graphql
        mutation CreateCart($language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
            cartCreate {
                cart {
                    id
                }
            }
        }
    `, {
        variables: localizationParamsSchema.parse({
            language: language.value,
            country: country.value,
        }),
    })).then(({ data }) =>
        id.value = data?.cartCreate?.cart?.id ?? '',
    // `init` and `get` are background bookkeeping, not user actions. A failure
    // in either means the storefront backend is unreachable or not configured
    // yet — a pre-launch condition. It toasted "Could not retrieve cart" within
    // 250ms of every page load, so a first-time visitor was told the store was
    // broken before touching anything. Both now degrade quietly to an empty
    // cart. Failures during a real user action still notify and carry a Retry.
    ).catch((error) => {
        console.warn('[cart] init failed; continuing with an empty cart', error)
    }).finally(() => setLoading(false))

    const get = (): Promise<unknown> => setLoading(true).then(() => storefront.request(`#graphql
        query GetCart($id: ID!, $language: LanguageCode, $country: CountryCode) 
        @inContext(language: $language, country: $country) {
            cart(id: $id) {
                ...CartFields
            }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartGetInputSchema.parse({
            id: id.value,
            language: language.value,
            country: country.value,
        }),
    })).then(({ data }) =>
        cart.value = data?.cart ?? undefined,
    ).catch((error) => {
        console.warn('[cart] read failed; continuing with an empty cart', error)
    }).finally(() => setLoading(false))

    // `notify: false` is for callers that open the cart panel themselves the
    // moment the mutation lands — the panel then IS the feedback, and a toast
    // on top of it would double up and cover the subtotal.
    const add = (variantId: string, quantity = 1, options: { notify?: boolean } = {}): Promise<unknown> => setLoading(true).then(() => storefront.request(`#graphql
        mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!, $language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
                cart {
                    ...CartFields
                }
                userErrors {
                    ...CartUserErrorFields
                }
            }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${CART_USER_ERRORS_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartLineInputSchema.parse({
            cartId: id.value,
            lines: [
                {
                    merchandiseId: variantId,
                    quantity,
                },
            ],
            language: language.value,
            country: country.value,
        }),
    })).then(({ data }) => {
        cart.value = data?.cartLinesAdd?.cart ?? undefined

        // The merchandise is back in the cart — by Undo, by the error toast's
        // Retry, or by a fresh Add — so its undo row has nothing left to undo.
        if (lines.value.some(line => line.merchandise.id === variantId)) {
            for (const removed of recentlyRemoved.value.filter(removed => removed.merchandiseId === variantId)) {
                dismissRemoved(removed.lineId)
            }
        }

        if ((options.notify ?? true) && !open.value) toast.add({
            title: t('cart.toast.add'),
            avatar: getAvatar(variantId, data?.cartLinesAdd?.cart?.lines),
            actions: [
                { label: t('cart.toast.view'), onClick: () => { open.value = true } },
            ],
            // DESIGN.md has no colour-as-state: the toast states its outcome in
            // words, not in green.
            color: 'neutral',
            ui: { avatar: 'rounded-none size-14' },
        })
    }).catch(() => toast.add({
        title: t('cart.toast.error.add'),
        description: t('cart.toast.error.tryAgain'),
        // Recoverable, and DESIGN.md forbids signalling state with colour — so
        // the toast carries an explicit Retry rather than a red the palette
        // does not have.
        actions: [
            { label: t('cart.toast.retry'), onClick: () => { void add(variantId, quantity, options) }, size: 'sm', class: 'min-h-6 min-w-6' },
        ],
    })).finally(() => setLoading(false))

    // Resolves with the quantity the server now holds for the line: the
    // requested one on success, the previous one when the mutation failed. A
    // failed update therefore rolls the row's input back instead of leaving a
    // number on screen that the subtotal does not reflect.
    const update = (variantId: string, quantity: number): Promise<number> => {
        const previous = lines.value.find(line => line.id === variantId)?.quantity ?? quantity

        return setLoading(true).then(() => storefront.request(`#graphql
        mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!, $language: LanguageCode, $country: CountryCode) 
        @inContext(language: $language, country: $country) {
            cartLinesUpdate(cartId: $cartId, lines: $lines) {
                cart {
                    ...CartFields
                }
                userErrors {
                    ...CartUserErrorFields
                }
            }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${CART_USER_ERRORS_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartUpdateInputSchema.parse({
            cartId: id.value,
            lines: [
                {
                    id: variantId,
                    quantity,
                },
            ],
            language: language.value,
            country: country.value,
        }),
    })).then(({ data }) => {
        cart.value = data?.cartLinesUpdate?.cart ?? undefined

        if (!open.value) toast.add({
            title: t('cart.toast.update'),
            avatar: getAvatar(variantId, data?.cartLinesUpdate?.cart?.lines),
            actions: [
                { label: t('cart.toast.view'), onClick: () => { open.value = true } },
            ],
            color: 'neutral',
            ui: { avatar: 'rounded-none size-14' },
        })

        return quantity
    }).catch(() => {
        toast.add({
            title: t('cart.toast.error.update'),
            description: t('cart.toast.error.tryAgain'),
            // Recoverable, and DESIGN.md forbids signalling state with colour —
            // so the toast carries an explicit Retry rather than a red the
            // palette does not have.
            actions: [
                { label: t('cart.toast.retry'), onClick: () => { void update(variantId, quantity) }, size: 'sm', class: 'min-h-6 min-w-6' },
            ],
        })

        return previous
    }).finally(() => setLoading(false))
    }

    const remove = (lineId: string): Promise<unknown> => {
        // Read before the mutation: once it lands the line is gone from `cart`.
        const line = lines.value.find(line => line.id === lineId)

        return setLoading(true).then(() => storefront.request(`#graphql
        mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!, $language: LanguageCode, $country: CountryCode) 
        @inContext(language: $language, country: $country) {
            cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart {
                    ...CartFields
                }
                userErrors {
                    ...CartUserErrorFields
                }
            }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${CART_USER_ERRORS_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartRemoveInputSchema.parse({
            cartId: id.value,
            lineIds: [lineId],
            language: language.value,
            country: country.value,
        }),
    })).then(({ data }) => {
        // Taken from the list as it stands, before the line leaves it.
        const after = rows.value[rows.value.findIndex(row => row.id === lineId) - 1]?.id ?? null

        cart.value = data?.cartLinesRemove?.cart ?? undefined

        // Closed, the toast is the only feedback there is. In the open panel
        // the row itself turns into an undo row, so a toast over it would say
        // the same thing twice.
        if (!open.value) {
            toast.add({
                title: t('cart.toast.remove'),
                actions: [
                    { label: t('cart.toast.view'), onClick: () => { open.value = true } },
                ],
                color: 'neutral',
            })

            return
        }

        const gone = !lines.value.some(current => current.id === lineId)
        const alreadyPending = recentlyRemoved.value.some(removed => removed.lineId === lineId)

        if (line && gone && !alreadyPending) recentlyRemoved.value = [...recentlyRemoved.value, {
            lineId,
            merchandiseId: line.merchandise.id,
            quantity: line.quantity,
            title: line.merchandise.product.title,
            options: line.merchandise.selectedOptions ?? [],
            after,
            undoing: false,
        }]
    }).catch(() => toast.add({
        title: t('cart.toast.error.remove'),
        description: t('cart.toast.error.tryAgain'),
        // Recoverable, and DESIGN.md forbids signalling state with colour — so
        // the toast carries an explicit Retry rather than a red the palette
        // does not have. The removal never touched `cart`, so the row's state
        // needs no rollback here.
        actions: [
            { label: t('cart.toast.retry'), onClick: () => { void remove(lineId) }, size: 'sm', class: 'min-h-6 min-w-6' },
        ],
    })).finally(() => setLoading(false))
    }

    // Puts a removed line back: same merchandise, same quantity, through
    // `add` without its toast — the undo row is the feedback. Success drops
    // the row from inside `add`; a failure leaves it (Undo enabled again) and
    // `add` raises its own error toast with Retry.
    const undo = async (lineId: string) => {
        const removed = recentlyRemoved.value.find(removed => removed.lineId === lineId)

        if (!removed || removed.undoing) return

        removed.undoing = true

        await add(removed.merchandiseId, removed.quantity, { notify: false })

        removed.undoing = false
    }

    return {
        open,
        loading,
        id,
        lines,
        rows,
        recentlyRemoved,
        quantity,
        subtotal,
        checkoutUrl,

        init,
        get,
        add,
        update,
        remove,
        undo,
        dismissRemoved,
        clearRemoved,
    }
}
