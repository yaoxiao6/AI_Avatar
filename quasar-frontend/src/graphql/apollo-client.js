// AI_Avatar/quasar-frontend/src/graphql/apollo-client.js
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core'

const apiUrl = process.env.VUE_APP_API_URL || 'https://node-backend-579795762739.us-central1.run.app/graphql'

// Create the http link
console.log('Creating Apollo HTTP link with URI:', apiUrl);
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
  console.log('executeGraphQL called with:', { 
    operationName: operation?.definitions?.[0]?.name?.value || 'unnamed operation',
    variables 
  });
  
  try {
    // Verify operation has the expected structure
    if (!operation || !operation.definitions || !operation.definitions[0]) {
      console.error('Invalid operation object:', operation);
      throw new Error('Invalid GraphQL operation object');
    }
    
    // Check if this is a query or mutation operation
    const operationType = operation.definitions[0].operation;
    console.log('Operation type detected:', operationType);
    
    let response;
    
    if (operationType === 'query') {
      // Handle query operations
      console.log('Executing Apollo query with:', { 
        query: operation.loc?.source?.body || '[query text not available]',
        variables 
      });
      
      response = await apolloClient.query({
        query: operation,
        variables: variables
      });
      
      console.log('Apollo query successful, response:', response);
    } else {
      // Handle mutation operations
      console.log('Executing Apollo mutation with:', { 
        mutation: operation.loc?.source?.body || '[mutation text not available]',
        variables 
      });
      
      response = await apolloClient.mutate({
        mutation: operation,
        variables: variables
      });
      
      console.log('Apollo mutation successful, response:', response);
    }
    
    return response;
  } catch (error) {
    console.error('GraphQL operation error details:', { 
      name: error.name,
      message: error.message,
      networkError: error.networkError,
      graphQLErrors: error.graphQLErrors,
      stack: error.stack
    });
    throw error;
  }
}