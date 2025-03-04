import { defineStore } from 'pinia';
import { executeGraphQL } from '../graphql/apollo-client';
import { ASK_QUESTION } from '../graphql/queries';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [
      {
        sender: 'bot',
        text: 'Hello! I\'m the virtual assistant for [Yao Xiao]. How can I help you today?',
        timestamp: formatTimestamp()
      }
    ],
    isTyping: false,
    error: null
  }),
  
  actions: {
    addMessage(sender, text) {
      this.messages.push({
        sender,
        text,
        timestamp: formatTimestamp()
      });
    },
    
    setTyping(value) {
      this.isTyping = value;
    },
    
    setError(error) {
      this.error = error;
    },
    
    async sendToAI(message) {
      this.setTyping(true);
      this.setError(null);
      
      try {
        // Make GraphQL mutation call using the executeGraphQL function
        const response = await executeGraphQL(ASK_QUESTION, {
          query: message,
          k: 3,
          scoreThreshold: 0.7
        });
        
        console.log('GraphQL response:', response);
        
        // Process the response
        if (response.data.askQuestion.status === 'success') {
          this.setTyping(false);
          return response.data.askQuestion.answer;
        } else {
          throw new Error(response.data.askQuestion.message);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        this.setTyping(false);
        this.setError(error.message || 'Failed to get a response. Please try again.');
        return 'Sorry, I encountered an error. Please try again.';
      }
    }
  }
});

// Helper function to format timestamp
function formatTimestamp() {
  return new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}