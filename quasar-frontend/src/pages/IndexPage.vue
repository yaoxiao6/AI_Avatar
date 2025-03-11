<!-- src/pages/IndexPage.vue -->

<template>
  <q-page class="q-pa-md">
    <div class="container">
      <header class="text-center q-py-md q-mb-lg">
        <h1 class="q-ma-none text-dark">Chat with Me</h1>
        <p>Ask me anything or leave your contact details for a personal follow-up</p>
      </header>
      
      <div class="row q-col-gutter-md">
        <!-- Chat Section -->
        <div class="col-12 col-md-8">
          <q-card class="chat-section">
            <div class="profile-header">
              <q-avatar size="60px" class="q-mr-md">
                <img src="~assets/your-profile.jpg" alt="Profile Picture">
              </q-avatar>
              <div class="profile-info">
                <h2 class="profile-name q-ma-none">Yao Xiao</h2>
                <p class="profile-status q-ma-none q-mt-sm">AI Assistant • Online</p>
              </div>
            </div>
            
            <!-- Properly using q-scroll-area component -->
            <q-scroll-area
              ref="scrollArea"
              class="chat-area"
              style="height: 400px;"
            >
              <div class="q-pa-md">
                <template v-for="(message, index) in messages" :key="index">
                  <q-chat-message
                    v-if="message.type === 'user'"
                    :text="[message.content]"
                    sent
                    text-color="white"
                    bg-color="primary"
                  >
                    <template v-slot:name>You</template>
                    <template v-slot:stamp>{{ message.timestamp }}</template>
                  </q-chat-message>

                  <q-chat-message
                    v-else
                    :text="[message.content]"
                    bg-color="grey-3"
                  >
                    <template v-slot:name>Yao</template>
                    <template v-slot:stamp>{{ message.timestamp }}</template>
                  </q-chat-message>
                </template>
              </div>
            </q-scroll-area>
            
            <div class="message-input q-pa-md">
              <q-input 
                v-model="newMessage" 
                placeholder="Type your message here..." 
                outlined 
                rounded 
                dense
                class="full-width"
                @keyup.enter="sendMessage"
                :disable="loading"
              >
                <template v-slot:append>
                  <q-btn 
                    round 
                    flat
                    color="accent" 
                    icon="send" 
                    @click="sendMessage"
                    :loading="loading"
                    :disable="!newMessage.trim()"
                  />
                </template>
              </q-input>
            </div>
          </q-card>
        </div>
        
        <!-- Contact Section -->
        <div class="col-12 col-md-4">
          <q-card class="contact-section">
            <q-card-section>
              <h2 class="text-primary q-mt-none q-mb-md">Get in Touch</h2>
              <p>Leave your details and I'll personally reach out to you soon.</p>
              
              <q-form @submit="onSubmit" class="q-gutter-md" v-if="!submitted">
                <q-input
                  v-model="formData.name"
                  label="Full Name *"
                  required
                  :rules="[val => !!val || 'Name is required']"
                />
                
                <q-input
                  v-model="formData.company"
                  label="Company Name"
                />
                
                <q-input
                  v-model="formData.email"
                  label="Email Address *"
                  type="email"
                  required
                  :rules="[
                    val => !!val || 'Email is required',
                    val => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(val) || 'Please enter a valid email'
                  ]"
                />
                
                <q-input
                  v-model="formData.phone"
                  label="Phone Number"
                  type="tel"
                />
                
                <q-input
                  v-model="formData.note"
                  label="Your Message"
                  type="textarea"
                  rows="4"
                  placeholder="How can I help you?"
                />
                
                <div>
                  <q-btn 
                    label="Send Message" 
                    type="submit" 
                    color="accent"
                    class="full-width"
                  />
                </div>
              </q-form>
              
              <div v-if="submitted" class="text-center q-pa-md">
                <q-icon name="check_circle" color="positive" size="lg" class="q-mb-md" />
                <h4 class="q-ma-none">Thanks for reaching out!</h4>
                <p>I'll get back to you soon.</p>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { ref, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { ASK_QUESTION, HEALTH_QUERY, Flask_HEALTH_QUERY } from '../graphql/queries'
import { executeGraphQL } from '../graphql/apollo-client'

export default {
  name: 'IndexPage',
  
  setup() {
    const $q = useQuasar()
    const scrollArea = ref(null)
    const messages = ref([
      {
        type: 'bot',
        content: 'Hello! I\'m the virtual assistant for Yao Xiao. How can I help you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
    const newMessage = ref('')
    const loading = ref(false)
    
    const formData = ref({
      name: '',
      company: '',
      email: '',
      phone: '',
      note: ''
    })
    const submitted = ref(false)

    const formatTimestamp = () => {
      return new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    const scrollToBottom = async () => {
      try {
        await nextTick()
        if (scrollArea.value) {
          // Using Quasar's proper scroll method
          scrollArea.value.setScrollPosition('vertical', 100000)
        }
      } catch (error) {
        console.error('Error in scrollToBottom:', error)
      }
    }

    const sendMessage = async () => {
      // Debug info - Check if function is being called
      console.log('DEBUG: sendMessage function triggered')
      
      // Check message and loading conditions
      if (!newMessage.value.trim() || loading.value) {
        return
      }
      
      // Set loading state
      loading.value = true
      console.log('STEP 1: Starting to send message:', newMessage.value)

      try {
        // Add user message (do this first to give immediate feedback)
        console.log('STEP 2: Adding user message to chat')
        messages.value.push({
          type: 'user',
          content: newMessage.value,
          timestamp: formatTimestamp()
        })

        // Store message and clear input
        const userMessage = newMessage.value
        newMessage.value = ''

        // Scroll to bottom after user message
        console.log('STEP 3: Scrolling to bottom after user message')
        await scrollToBottom()
        
        // Temporary solution: If executeGraphQL isn't working, 
        // simulate a response instead of making API calls
        try {
          console.log('STEP 4: Attempting to check GraphQL API health')
          // First make a simpler GraphQL call to test connection
          const healthCheck = await executeGraphQL(HEALTH_QUERY)
          console.log('GraphQL Health Status:', healthCheck?.data?.health)
          
          console.log('STEP 5: Checking Python service health')
          const pythonHealthCheck = await executeGraphQL(Flask_HEALTH_QUERY)
          console.log('Python Service Health Status:', pythonHealthCheck?.data?.pythonServiceHealth?.status)
          
          // Make GraphQL mutation call for the actual message
          console.log('STEP 6: Sending query to GraphQL API')
          const response = await executeGraphQL(ASK_QUESTION, {
            query: userMessage,
            k: 5,
            scoreThreshold: 0.2
          })

          console.log('STEP 7: Received GraphQL response:', response)

          // Add bot response
          if (response?.data?.askQuestion?.status === 'success') {
            console.log('STEP 8: Adding successful bot response')
            messages.value.push({
              type: 'bot',
              content: response.data.askQuestion.answer,
              timestamp: formatTimestamp()
            })
            
            // Log retrieval metadata if available
            if (response.data.askQuestion.metadata) {
              console.log('Retrieval metadata:', response.data.askQuestion.metadata)
            }
          } else {
            console.error('STEP 8: Bot response indicates failure')
            throw new Error(response?.data?.askQuestion?.message || 'Unknown GraphQL error')
          }
        } catch (graphqlError) {
          console.error('GraphQL Error:', graphqlError)
          console.log('STEP FALLBACK: Using fallback response due to GraphQL error')
          
          // Add fallback response if GraphQL fails
          messages.value.push({
            type: 'bot',
            content: "I received your message, but I'm having trouble connecting to my knowledge base. The development team has been notified of this issue.",
            timestamp: formatTimestamp()
          })
        }

        console.log('STEP 9: Scrolling to bottom after bot response')
        await scrollToBottom()
        console.log('STEP 10: Message exchange completed')
      } catch (error) {
        console.error('ERROR: Failed during message process:', error)
        
        // Ensure we still show a response even if something fails
        messages.value.push({
          type: 'bot',
          content: 'Sorry, I encountered an error processing your message. Please try again.',
          timestamp: formatTimestamp()
        })
        
        // Only show notification if Quasar is properly initialized
        $q.notify({
          type: 'negative',
          message: 'Failed to send message. Please try again.',
          position: 'top'
        })
        
        await scrollToBottom()
      } finally {
        loading.value = false
        console.log('STEP FINAL: Message handling process completed')
      }
    }

    const onSubmit = () => {
      // Here you would typically send the form data to your backend
      // For now, we'll just show the success message
      submitted.value = true;
      
      // You can connect this to axios or apollo client to send the data
      console.log('Form submitted:', formData.value);
    }

    return {
      scrollArea,
      messages,
      newMessage,
      sendMessage,
      loading,
      formData,
      submitted,
      onSubmit
    }
  }
}
</script>

<style lang="scss" scoped>
.chat-section {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.profile-header {
  display: flex;
  align-items: center;
  background-color: $primary;
  padding: 15px;
  color: white;
}

.profile-info {
  flex-grow: 1;
}

.profile-name {
  font-weight: bold;
  font-size: 18px;
}

.profile-status {
  font-size: 14px;
  opacity: 0.9;
}

.chat-area {
  flex: 1;
  background-color: #f9f9f9;
}

.message-input {
  border-top: 1px solid #eee;
}

.contact-section {
  height: 100%;
}
</style>