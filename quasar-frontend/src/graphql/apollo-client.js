// AI_Avatar/quasar-frontend/src/graphql/apollo-client.js
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core'

// Create the http link
const httpLink = createHttpLink({
  uri: 'https://node-backend-579795762739.us-central1.run.app/graphql', // hard-coded for now
  fetchOptions: {
    mode: 'cors',
  },
  credentials: 'include',
})

// Create the apollo client
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'ignore',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

// Create a composable function to use the client
export async function executeGraphQL(operation, variables = {}) {
  try {
    const response = await apolloClient.mutate({
      mutation: operation,
      variables: variables
    })
    return response
  } catch (error) {
    console.error('GraphQL operation error:', error)
    throw error
  }
}