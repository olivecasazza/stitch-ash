import type { CartFieldsFragment } from '#shopify/storefront'

export const useCart = () => {
    const { language, country } = useLocalization()
    const storefront = useStorefront()
    const toast = useToast()
    const { t } = useI18n()

    const cart = useState<CartFieldsFragment | undefined>('shopify-cart', () => undefined)
    const loading = useState('shopify-cart-loading', () => ref(false))
    const open = useState('shopify-cart-open', () => ref(false))

    const id = useCookie<string>('shopify-cart-id', undefined)

    const lines = computed(() => flattenConnection(cart.value?.lines))
    const checkoutUrl = computed(() => cart.value?.checkoutUrl)
    const quantity = computed(() => cart.value?.totalQuantity)
    const total = computed(() => cart.value?.cost.totalAmount)

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

    // `init` and `get` are background bookkeeping, not user actions. A failure
    // in either means the storefront backend is unreachable or not configured
    // yet — a pre-launch condition. Surfacing it told every first-time visitor
    // the store was broken before they had touched anything, so both now
    // degrade quietly to an empty cart. Failures during a real user action
    // still notify, via notifyFailure(), which carries a retry.
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

    const add = (variantId: string, quantity = 1): Promise<unknown> => setLoading(true).then(() => storefront.request(`#graphql
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

        if (!open.value) toast.add({
            title: t('cart.toast.add'),
            avatar: getAvatar(variantId, data?.cartLinesAdd?.cart?.lines),
            actions: [
                { label: t('cart.toast.view'), onClick: () => { open.value = true } },
            ],
            color: 'success',
            ui: { avatar: 'rounded-sm size-14' },
        })
    // A user-initiated mutation that failed is worth interrupting for, but it
    // must be recoverable: DESIGN.md forbids signalling state with colour, so
    // the toast carries an explicit Retry action instead of relying on a red
    // treatment the palette does not have.
    }).catch(() => toast.add({
        title: t('cart.toast.error.add'),
        description: t('cart.toast.error.tryAgain'),
        actions: [
            { label: t('cart.toast.retry'), onClick: () => { void add(variantId, quantity) } },
        ],
    })).finally(() => setLoading(false))

    const update = (variantId: string, quantity: number): Promise<unknown> => setLoading(true).then(() => storefront.request(`#graphql
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
            color: 'success',
            ui: { avatar: 'rounded-sm size-14' },
        })
    }).catch(() => toast.add({
        title: t('cart.toast.error.update'),
        description: t('cart.toast.error.tryAgain'),
        actions: [
            { label: t('cart.toast.retry'), onClick: () => { void update(variantId, quantity) } },
        ],
    })).finally(() => setLoading(false))

    const remove = (variantId: string): Promise<unknown> => setLoading(true).then(() => storefront.request(`#graphql
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
            lineIds: [variantId],
            language: language.value,
            country: country.value,
        }),
    })).then(({ data }) => {
        cart.value = data?.cartLinesRemove?.cart ?? undefined

        if (!open.value) toast.add({
            title: t('cart.toast.remove'),
            actions: [
                { label: t('cart.toast.view'), onClick: () => { open.value = true } },
            ],
            color: 'success',
        })
    }).catch(() => toast.add({
        title: t('cart.toast.error.remove'),
        description: t('cart.toast.error.tryAgain'),
        actions: [
            { label: t('cart.toast.retry'), onClick: () => { void remove(variantId) } },
        ],
    })).finally(() => setLoading(false))

    return {
        open,
        loading,
        id,
        lines,
        quantity,
        total,
        checkoutUrl,

        init,
        get,
        add,
        update,
        remove,
    }
}
