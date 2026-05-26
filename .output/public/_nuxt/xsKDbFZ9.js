const e=`#graphql
    fragment ArticleFields on Article {
        id
        title
        handle
        excerpt
        content
        contentHtml
        publishedAt
        seo {
            title
            description
        }
    }
`,t=`#graphql
    fragment BlogFields on Blog {
        id
        title
        articles(first: 250) {
            edges {
                node {
                    ...ArticleFields
                }
            }
        }
        seo {
            title
            description
        }
    }
    ${e}
`;export{e as A,t as B};
