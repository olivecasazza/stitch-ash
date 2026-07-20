<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const { data: blog, error } = await useStorefrontData(`blog-${locale.value}-${handle.value}`, `#graphql
    query FetchBlog($handle: String) {
        blog(handle: $handle) {
            ...BlogFields
        }
    }
    ${BLOG_FRAGMENT}
`, {
    variables: {
        handle: handle.value,
    },
    transform: data => data?.blog,
    cache: 'long',
})

if (!blog.value || error.value) {
    throw createError({
        status: 404,
        statusText: `${$t('error.notFound')}: ${route.fullPath}`,
        message: error.value?.message || $t('error.blog'),
    })
}

useSeoMeta({
    title: `${blog.value?.seo?.title ?? blog.value?.title} | ${shopName}`,
    description: blog.value?.seo?.description ?? $t('seo.description'),
})
</script>

<template>
  <main class="wrap" style="padding-block: clamp(2rem, 4vw, 3.5rem) clamp(3rem, 8vw, 6rem);">
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/" class="breadcrumb__link">Home</NuxtLink>
      <span class="breadcrumb__sep" aria-hidden="true">/</span>
      <span class="breadcrumb__current">{{ blog?.title }}</span>
    </nav>

    <h1 class="blog-title">{{ blog?.title }}</h1>

    <div class="blog-posts">
      <article
        v-for="article in flattenConnection(blog?.articles)"
        :key="article.id"
        class="blog-card"
      >
        <NuxtLink
          :to="localePath(`/blog/${handle}/${article.handle}`)"
          class="blog-card__link"
        >
          <h2 class="blog-card__title">{{ article.title }}</h2>
          <time class="blog-card__date">{{ article.publishedAt }}</time>
          <p v-if="article.excerpt" class="blog-card__excerpt">{{ article.excerpt }}</p>
        </NuxtLink>
      </article>
    </div>
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

.blog-title {
  margin: 0 0 var(--space-5);
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.01em;
  color: var(--bone);
  line-height: 1.05;
}

.blog-posts {
  display: grid;
  gap: var(--space-4);
}

.blog-card {
  border-bottom: var(--rule-light);
  padding-block-end: var(--space-4);
}

.blog-card__link {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: opacity var(--transition-base);
}

.blog-card__link:hover {
  opacity: 0.85;
}

.blog-card__title {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: var(--text-xl);
  color: var(--bone);
}

.blog-card__date {
  display: block;
  font-size: var(--text-xs);
  color: var(--grey-500);
  letter-spacing: 0.04em;
  margin-block-end: 0.35rem;
  text-transform: uppercase;
}

.blog-card__excerpt {
  margin: 0;
  font-size: var(--text-base);
  color: var(--grey-400);
  line-height: 1.5;
}
</style>
