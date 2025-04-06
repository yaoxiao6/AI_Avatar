import gql from 'graphql-tag'

export const SUBMIT_CONTACT = gql`
  mutation SubmitContact($input: ContactInput!) {
    submitContact(input: $input) {
      status
      message
    }
  }
`

