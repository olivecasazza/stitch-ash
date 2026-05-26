import { a as _sfc_main$1, _ as _sfc_main$2 } from './Breadcrumb-DKf_g8cz.mjs';
import { ax as vueExports, ak as useI18n, a7 as useAppConfig, am as useLocalePath, aq as useRoute$1, s as createError, as as useSeoMeta, a2 as serverRenderer_cjs_prodExports } from './server.mjs';
import { u as useStorefrontData } from './async-XfSVIDig.mjs';
import { A as ARTICLE_FRAGMENT } from './blog-B0bN3v1U.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'lru-cache';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'vue-router';
import 'node:url';
import 'zod';
import '@iconify/utils';
import 'consola';
import 'perfect-debounce';
import 'node:diagnostics_channel';
import 'node:stream';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'vue/server-renderer';
import 'unhead/server';
import 'devalue';
import 'unhead/plugins';
import 'unhead/utils';
import 'vue';

const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "[article]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { t: $t } = useI18n();
    const { shopify: { shopName } } = useAppConfig();
    const localePath = useLocalePath();
    const { locale } = useI18n();
    const route = useRoute$1();
    const handle = vueExports.computed(() => route.params.handle);
    const article = vueExports.computed(() => route.params.article);
    const { data: blog, error } = ([__temp, __restore] = vueExports.withAsyncContext(() => useStorefrontData(`article-${locale.value}-${handle.value}`, `#graphql
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
        article: article.value
      },
      transform: (data) => data?.blog,
      cache: "long"
    })), __temp = await __temp, __restore(), __temp);
    const articleData = vueExports.computed(() => blog.value?.articleByHandle);
    if (!articleData.value || error.value) {
      throw createError({
        status: 404,
        statusText: `${$t("error.notFound")}: ${route.fullPath}`,
        message: error.value?.message || $t("error.article")
      });
    }
    useSeoMeta({
      title: `${articleData.value?.seo?.title ?? articleData.value?.title} | ${shopName}`,
      description: articleData.value?.seo?.description ?? $t("seo.description")
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UContainer = _sfc_main$1;
      const _component_UBreadcrumb = _sfc_main$2;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UContainer, vueExports.mergeProps({ class: "py-6 lg:py-8" }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UBreadcrumb, {
              items: [
                { label: "Blog" },
                { label: vueExports.unref(blog)?.title, to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}`) },
                { label: vueExports.unref(articleData)?.title, to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}/${vueExports.unref(article)}`) }
              ],
              class: "mb-8"
            }, null, _parent2, _scopeId));
            _push2(`<div class="prose lg:prose-lg max-w-none"${_scopeId}><h1${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(articleData)?.title)}</h1><div${_scopeId}>${vueExports.unref(articleData)?.contentHtml ?? ""}</div></div>`);
          } else {
            return [
              vueExports.createVNode(_component_UBreadcrumb, {
                items: [
                  { label: "Blog" },
                  { label: vueExports.unref(blog)?.title, to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}`) },
                  { label: vueExports.unref(articleData)?.title, to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}/${vueExports.unref(article)}`) }
                ],
                class: "mb-8"
              }, null, 8, ["items"]),
              vueExports.createVNode("div", { class: "prose lg:prose-lg max-w-none" }, [
                vueExports.createVNode("h1", null, vueExports.toDisplayString(vueExports.unref(articleData)?.title), 1),
                vueExports.createVNode("div", {
                  innerHTML: vueExports.unref(articleData)?.contentHtml
                }, null, 8, ["innerHTML"])
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/blog/[handle]/[article].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_article_-Dkp9bP9J.mjs.map
