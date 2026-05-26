import{_ as $,a as v}from"./Mhm_Vjey.js";import{Q as y,b2 as d,aQ as B,b5 as x,b9 as A,bk as C,G as H,bb as w,at as S,y as T,bl as F,O as L,aO as e,x as r,aH as M,v as n}from"./Cbe0nSeg.js";import{u as N}from"./NH0S4j6j.js";import{A as k}from"./xsKDbFZ9.js";const D={class:"prose lg:prose-lg max-w-none"},E=["innerHTML"],Q=y({__name:"[article]",async setup(P){let t,c;const{t:s}=d(),{shopify:{shopName:h}}=B(),i=x(),{locale:b}=d(),o=A(),l=n(()=>o.params.handle),u=n(()=>o.params.article),{data:m,error:p}=([t,c]=C(()=>N(`article-${b.value}-${l.value}`,`#graphql
    query FetchBlogArticle($handle: String!, $article: String!) {
        blog(handle: $handle) {
            title
            articleByHandle(handle: $article) {
                ...ArticleFields
            }
        }
    }
    ${k}
`,{variables:{handle:l.value,article:u.value},transform:_=>_?.blog,cache:"long"})),t=await t,c(),t),a=n(()=>m.value?.articleByHandle);if(!a.value||p.value)throw H({status:404,statusText:`${s("error.notFound")}: ${o.fullPath}`,message:p.value?.message||s("error.article")});return w({title:`${a.value?.seo?.title??a.value?.title} | ${h}`,description:a.value?.seo?.description??s("seo.description")}),(_,R)=>{const g=$,f=v;return S(),T(f,{class:"py-6 lg:py-8"},{default:F(()=>[L(g,{items:[{label:"Blog"},{label:e(m)?.title,to:e(i)(`/blog/${e(l)}`)},{label:e(a)?.title,to:e(i)(`/blog/${e(l)}/${e(u)}`)}],class:"mb-8"},null,8,["items"]),r("div",D,[r("h1",null,M(e(a)?.title),1),r("div",{innerHTML:e(a)?.contentHtml},null,8,E)])]),_:1})}}});export{Q as default};
