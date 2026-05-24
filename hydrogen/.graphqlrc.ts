/**
 * GraphQL Config
 * @see https://the-guild.dev/graphql/config/docs/user/usage
 */
export default {
  projects: {
    default: {
      schema: './storefrontapi.generated.d.ts',
      documents: [
        './*.{ts,tsx,js,jsx}',
        './app/**/*.{ts,tsx,js,jsx}',
        '!./app/graphql/**/*.{ts,tsx,js,jsx}',
      ],
    },
    customer: {
      schema: './customer-accountapi.generated.d.ts',
      documents: ['./app/graphql/customer-account/*.{ts,tsx,js,jsx}'],
    },
  },
} as any;
