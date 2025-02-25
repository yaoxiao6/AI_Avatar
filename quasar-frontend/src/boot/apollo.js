import { apolloClient } from '../graphql/apollo-client'
import { DefaultApolloClient } from '@vue/apollo-composable'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default async ({ app }) => {
  // something to do
  app.provide(DefaultApolloClient, apolloClient)
}