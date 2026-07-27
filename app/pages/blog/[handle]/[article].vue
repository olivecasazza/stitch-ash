<script setup lang="ts">
definePageMeta({
    validate: route =>
        typeof route.params.handle === 'string'
        && typeof route.params.article === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)
const article = computed(() => route.params.article as string)

const { data: blog, error } = await useStorefrontData(`article-${locale.value}-${handle.value}`, `#graphql
    query FetchBlogArticle($handle: String!, $article: String!) {
        blog(handle: $handle) {
            title
            articleByHandle(handle: $article) {
                ...ArticleFields
            }
        }
    }
    ${ARTICLE_FRAGMENT}
`, {
    variables: {
        handle: handle.value,
        article: article.value,
    },
    transform: data => data?.blog,
    cache: 'long',
})

const articleData = computed(() => blog.value?.articleByHandle)

if (!articleData.value || error.value) {
    throw createError({
        status: 404,
        statusText: `${$t('error.notFound')}: ${route.fullPath}`,
        message: error.value?.message || $t('error.article'),
    })
}

useSeoMeta({
    title: `${articleData.value?.seo?.title ?? articleData.value?.title} | ${shopName}`,
    description: articleData.value?.seo?.description ?? $t('seo.description'),
})
</script>

<template>
  <main class="wrap" style="padding-block: clamp(2rem, 4vw, 3.5rem) clamp(3rem, 8vw, 6rem);">
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/" class="breadcrumb__link">Home</NuxtLink>
      <span class="breadcrumb__sep" aria-hidden="true">/</span>
      <NuxtLink :to="localePath(`/blog/${handle}`)" class="breadcrumb__link">{{ blog?.title }}</NuxtLink>
      <span class="breadcrumb__sep" aria-hidden="true">/</span>
      <span class="breadcrumb__current">{{ articleData?.title }}</span>
    </nav>

    <article class="article-content measure stack-lg">
      <h1 class="article-title">{{ articleData?.title }}</h1>

      <div
        class="article-body"
        v-html="articleData?.contentHtml"
      />
    </article>
  </main>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--grey-500);
  flex-wrap: wrap;
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
  color: var(--grey-600);
}

.breadcrumb__current {
  color: var(--grey-300);
}

.article-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.01em;
  color: var(--bone);
  line-height: 1.05;
}

.article-content {
  padding-block-start: var(--space-4);
}

/* Blog body (rich text from Shopify) */
.article-body {
  font-size: var(--text-base);
  line-height: 1.7;
  color: var(--grey-300);
}

.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4) {
  font-family: var(--font-display);
  font-weight: 500;
  color: var(--bone);
  margin-block: var(--space-4) var(--space-2);
}

.article-body :deep(h2) {
  font-size: var(--text-2xl);
}

.article-body :deep(h3) {
  font-size: var(--text-xl);
}

.article-body :deep(p) {
  margin-block: 0 1rem;
}

.article-body :deep(a) {
  color: var(--bone);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.article-body :deep(a:hover) {
  opacity: 0.8;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  margin-block: var(--space-4);
  border: var(--rule-light);
}

.article-body :deep(blockquote) {
  border-inline-start: 2px solid var(--grey-600);
  padding-inline-start: var(--space-3);
  margin-inline: 0;
  color: var(--grey-400);
  font-style: italic;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  padding-inline-start: 1.2rem;
}

.article-body :deep(li) {
  margin-block: 0.35rem;
}

.article-body :deep(hr) {
  border: none;
  border-block-start: var(--rule-light);
  margin-block: var(--space-5);
}
</style>
