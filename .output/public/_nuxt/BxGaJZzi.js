import{_ as $,a as v}from"./6leH40P8.js";import{O as y,b1 as d,aP as B,b4 as x,b8 as A,bj as C,C as w,ba as N,as as H,x as S,bk as T,N as F,aN as e,w as r,aG as L,u as n}from"./DjMlqn-R.js";import{u as M}from"./BoVyCcaK.js";import{A as P}from"./xsKDbFZ9.js";const k={class:"prose lg:prose-lg max-w-none"},D=["innerHTML"],V=y({__name:"[article]",async setup(E){let t,c;const{t:l}=d(),{shopify:{shopName:h}}=B(),i=x(),{locale:g}=d(),o=A(),s=n(()=>o.params.handle),u=n(()=>o.params.article),{data:m,error:p}=([t,c]=C(()=>M(`article-${g.value}-${s.value}`,`#graphql
    query FetchBlogArticle($handle: String!, $article: String!) {
        blog(handle: $handle) {
            title
            articleByHandle(handle: $article) {
                ...ArticleFields
            }
        }
    }
    ${P}
`,{variables:{handle:s.value,article:u.value},transform:_=>_?.blog,cache:"long"})),t=await t,c(),t),a=n(()=>m.value?.articleByHandle);if(!a.value||p.value)throw w({status:404,statusText:`${l("error.notFound")}: ${o.fullPath}`,message:p.value?.message||l("error.article")});return N({title:`${a.value?.seo?.title??a.value?.title} | ${h}`,description:a.value?.seo?.description??l("seo.description")}),(_,R)=>{const b=$,f=v;return H(),S(f,{class:"py-6 lg:py-8"},{default:T(()=>[F(b,{items:[{label:"Blog"},{label:e(m)?.title,to:e(i)(`/blog/${e(s)}`)},{label:e(a)?.title,to:e(i)(`/blog/${e(s)}/${e(u)}`)}],class:"mb-8"},null,8,["items"]),r("div",k,[r("h1",null,L(e(a)?.title),1),r("div",{innerHTML:e(a)?.contentHtml},null,8,D)])]),_:1})}}});export{V as default};
