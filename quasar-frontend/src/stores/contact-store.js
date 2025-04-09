import { defineStore } from 'pinia';
import { executeGraphQL } from '../graphql/apollo-client';
import { SUBMIT_CONTACT } from '../graphql/contact-queries';

export const useContactStore = defineStore('contact', {
  state: () => ({
    submitted: false,
    loading: false,
    error: null
  }),
  
  actions: {
    async submitContactForm(formData) {
      this.loading = true;
      this.error = null;
      
      try {
        // Validate that required fields are present
        if (!formData.name || !formData.email) {
          throw new Error('Name and email are required fields');
        }
        
        // Here we'll use GraphQL to submit the contact form
        const response = await executeGraphQL(SUBMIT_CONTACT, {
          input: {
            name: formData.name,
            company: formData.company || '',
            email: formData.email,
            phone: formData.phone || '',
            note: formData.note || ''
          }
        });
        
        console.log('Contact form submission response:', response);
        
        // Check if the submission was successful
        if (response?.data?.submitContact?.status === 'success') {
          this.submitted = true;
          this.loading = false;
          return true;
        } else {
          throw new Error(response?.data?.submitContact?.message || 'Failed to submit form');
        }
      } catch (error) {
        // Check for GraphQL specific errors
        const graphQLErrors = error?.graphQLErrors || [];
        if (graphQLErrors.length > 0) {
          console.error('GraphQL errors:', graphQLErrors);
          this.error = graphQLErrors.map(e => e.message).join(', ');
        } else if (error?.networkError) {
          console.error('Network error:', error.networkError);
          this.error = 'Network error: Unable to reach the server';
        } else {
          // Real error handling
          console.error('Error submitting form:', error);
          this.error = error.message || 'Failed to submit form';
        }
        
        this.loading = false;
        return false;
      }
    },
    
    resetForm() {
      this.submitted = false;
      this.error = null;
    }
  }
});