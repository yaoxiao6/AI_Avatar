import gql from 'graphql-tag'

export const SUBMIT_CONTACT = gql`
  mutation SubmitContact($input: ContactInput!) {
    submitContact(input: $input) {
      status
      message
    }
  }
`

// For validation purposes, this is the structure of ContactInput
// based on the backend schema:
/*
input ContactInput {
  name: String!     // Required
  company: String   // Optional
  email: String!    // Required
  phone: String     // Optional
  note: String      // Optional
}
*/

