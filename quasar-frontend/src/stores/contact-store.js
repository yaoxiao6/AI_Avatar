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
        if (response.data.submitContact.status === 'success') {
          this.submitted = true;
          this.loading = false;
          return true;
        } else {
          throw new Error(response.data.submitContact.message || 'Failed to submit form');
        }
      } catch (error) {
        // If backend integration is not ready yet, we'll simulate success for demonstration
        // IMPORTANT: Remove this block when backend is ready
        if (!SUBMIT_CONTACT || error.message.includes('Cannot query field')) {
          console.warn('Backend not ready, simulating success');
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.submitted = true;
          this.loading = false;
          return true;
        }
        
        // Real error handling
        console.error('Error submitting form:', error);
        this.error = error.message || 'Failed to submit form';
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