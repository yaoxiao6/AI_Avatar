import gql from 'graphql-tag'

// This is a placeholder mutation for submitting contact information
// You would need to implement this on your backend
export const SUBMIT_CONTACT = gql`
  mutation SubmitContact($input: ContactInput!) {
    submitContact(input: $input) {
      status
      message
    }
  }
`

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