// AI_Avatar/quasar-frontend/src/graphql/queries.js

import gql from 'graphql-tag'

export const HEALTH_QUERY = gql`
  query Health {
    health
  }
`

// STEP 1: First, make sure your queries.js file correctly exports the gql tagged query
export const ASK_FIREBASE = gql`
  mutation AskFirebase($query: String!, $limit: Int) {
    askFirebase(query: $query, limit: $limit) {
      status
      answer
      message
    }
  }
`


export const CLEAR_STORE = gql`
  mutation ClearStore {
    clearVectorStore {
      status
      message
    }
  }
`

// NOTE: The SUBMIT_CONTACT mutation is now defined in contact-queries.js