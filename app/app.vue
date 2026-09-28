<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { shopify: { shopName } } = useAppConfig()
const { language } = useLocalization()
const { id, init, get } = useCart()

const lang = computed(() => locales[language.value].code)
const dir = computed(() => locales[language.value].dir)

// STI-439: og:image must be an absolute URL or LinkedIn/Twitter/Slack drop the
// unfurl entirely — a root-relative path is a worse failure than the demo logo
// it replaces, because it looks fixed. Resolved per-request from the host the
// site is actually served on, so the apex and the preview host are both correct
// with no deploy-time environment variable.
const requestUrl = useRequestURL()
const brandImage = computed(() => new URL('/og-brand-card.png', requestUrl.origin).href)

useHead({
    htmlAttrs: {
        lang,
        dir,
    },

    title: shopName,

    meta: [
        { property: 'og:image', content: brandImage },
        { property: 'og:image:type', content: 'image/png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: brandImage },
        { name: 'twitter:image:src', content: brandImage },
        { property: 'og:image:width', content: '1200' },
        { name: 'twitter:image:width', content: '1200' },
        { property: 'og:image:height', content: '600' },
        { name: 'twitter:image:height', content: '600' },
    ],
})

watch(id, value => !value ? init().then(get) : get(), { immediate: true })
</script>

<template>
    <UApp :locale="locales[language]">
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
