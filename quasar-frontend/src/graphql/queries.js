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