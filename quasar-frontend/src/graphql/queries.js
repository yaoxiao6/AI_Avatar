// AI_Avatar/quasar-frontend/src/graphql/queries.js

import gql from 'graphql-tag'

export const HEALTH_QUERY = gql`
  query Health {
    health
  }
`

export const Flask_HEALTH_QUERY = gql`
  query PythonServiceHealth {
    pythonServiceHealth {
      status
    }
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

export const ASK_FIREBASE = gql`
  mutation AskFirebase($query: String!, $limit: Int) {
    askFirebase(query: $query, limit: $limit) {
      status
      answer
      message
      sources {
        content
        filename
        score
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

// This is a placeholder mutation for submitting contact information
// You would need to implement this on your backend
// export const SUBMIT_CONTACT = gql`
//   mutation SubmitContact($input: ContactInput!) {
//     submitContact(input: $input) {
//       status
//       message
//     }
//   }
// `

// The expected structure of the ContactInput type on the backend
/*
input ContactInput {
  name: String!
  company: String
  email: String!
  phone: String
  note: String
}
*/