<script setup lang="ts">
import type { NuxtError } from '#app'

import * as locales from '@nuxt/ui/locale'

const props = defineProps<{
    error: NuxtError
}>()

const { shopify: { shopName } } = useAppConfig()
const { language } = useLocalization()
const { id, init, get } = useCart()
const localePath = useLocalePath()

const lang = computed(() => locales[language.value].code)
const dir = computed(() => locales[language.value].dir)

useHead({
    htmlAttrs: {
        lang,
        dir,
    },
    title: shopName,
})

watch(id, value => !value ? init().then(get) : get(), { immediate: true })
</script>

<template>
    <UApp :locale="locales[language]">
        <NuxtLayout>
            <main class="error-page wrap measure">
                <div class="error-card">
                    <h1 class="error-code">{{ props.error.statusCode }}</h1>
                    <p class="error-message">{{ props.error.statusMessage || props.error.message }}</p>
                    <NuxtLink
                        :to="localePath('/')"
                        class="error-link"
                    >
                        &larr; Back to home
                    </NuxtLink>
                </div>
            </main>
        </NuxtLayout>
    </UApp>
</template>

<style scoped>
.error-page {
    padding-block: clamp(4rem, 12vw, 8rem);
    text-align: center;
}

.error-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xl);
}

.error-code {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(4rem, 12vw, 8rem);
    line-height: 1;
    color: var(--border-rule);
    letter-spacing: -0.03em;
}

.error-message {
    margin: 0;
    font-size: var(--text-lg);
    color: var(--grey-400);
    line-height: 1.5;
    max-width: 36ch;
}

.error-link {
    display: inline-block;
    margin-block-start: var(--space-lg);
    font-size: var(--text-sm);
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--bone);
    text-decoration: none;
    border-bottom: 1px solid var(--border-rule);
    padding-block-end: 2px;
    transition: border-color var(--transition-base);
}

.error-link:hover,
.error-link:focus-visible {
    border-color: var(--bone);
    outline: none;
}
</style>
