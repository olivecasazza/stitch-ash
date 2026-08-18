<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const key = computed(() => `collection-${locale.value}-${handle.value}`)

const { data: collection, error } = await useStorefrontData(key, `#graphql
    query FetchCollection(
        $handle: String,
        $language: LanguageCode,
        $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
        collection(handle: $handle) {
            ...CollectionFields
        }
    }
    ${COLLECTION_FRAGMENT}
    ${IMAGE_FRAGMENT}
`, {
    variables: computed(() => collectionInputSchema.parse({
        handle: handle.value,
    })),
    transform: data => data?.collection,
    cache: 'long',
})

if (!collection.value || error.value) {
    throw createError({
        status: 404,
        statusText: `${$t('error.notFound')}: ${route.fullPath}`,
        message: error.value?.message || $t('error.collection'),
        fatal: true,
    })
}

useSeoMeta({
    title: `${collection.value?.title} | ${shopName}`,
    description: collection.value?.description ?? $t('seo.description'),
})
</script>

<template>
  <main class="wrap" style="padding-block: clamp(2rem, 4vw, 3.5rem) clamp(3rem, 8vw, 6rem);">
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/" class="breadcrumb__link">Home</NuxtLink>
      <span class="breadcrumb__sep" aria-hidden="true">/</span>
      <span class="breadcrumb__current">{{ collection?.title }}</span>
    </nav>

    <h1 class="collection-title">{{ collection?.title }}</h1>

    <p v-if="collection?.description" class="collection-desc">
      {{ collection?.description }}
    </p>

    <CollectionProducts :handle="handle" />
  </main>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-block-end: var(--space-2xl);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--grey-400);
}

.breadcrumb__link {
  color: var(--grey-400);
  text-decoration: none;
  transition: color var(--transition-base);
}

.breadcrumb__link:hover,
.breadcrumb__link:focus-visible {
  color: var(--bone);
  outline: none;
}

.breadcrumb__sep {
  color: var(--border-rule);
}

.breadcrumb__current {
  color: var(--grey-400);
}

.collection-title {
  margin: 0 0 var(--space-xl);
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.01em;
  color: var(--bone);
  line-height: 1.05;
}

.collection-desc {
  margin: 0 0 var(--space-3xl);
  font-size: var(--text-lg);
  color: var(--grey-400);
  max-width: var(--measure);
  line-height: 1.6;
}
</style>
