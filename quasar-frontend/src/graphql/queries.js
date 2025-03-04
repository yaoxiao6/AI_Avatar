// AI_Avatar/quasar-frontend/src/graphql/queries.js

import gql from 'graphql-tag'

export const HEALTH_QUERY = gql`
  query Health {
    health
  }
`

export const ASK_QUESTION = gql`
  mutation AskQuestion($query: String!, $k: Int, $scoreThreshold: Float) {
    askQuestion(query: $query, k: $k, scoreThreshold: $scoreThreshold) {
      status
      answer
      message
      metadata {
        contextFound
        numChunksRetrieved
      }
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