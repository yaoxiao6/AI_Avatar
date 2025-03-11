// AI_Avatar/quasar-frontend/src/graphql/apollo-client.js
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core'

const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:4000/graphql'

// Create the http link
const httpLink = createHttpLink({
  uri: apiUrl,
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
  connectToDevTools: process.env.NODE_ENV !== 'production',
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