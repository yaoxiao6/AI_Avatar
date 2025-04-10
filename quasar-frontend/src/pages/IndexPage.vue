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
        <div class="col-12 col-lg-8 col-md-7">
          <q-card class="chat-section">
            <div class="profile-header">
              <q-avatar size="60px" class="q-mr-md">
                <img src="~assets/your-profile.jpg" alt="Profile Picture" />
              </q-avatar>
              <div class="profile-info">
                <h2 class="profile-name q-ma-none">Yao Xiao</h2>
                <p class="profile-status q-ma-none q-mt-sm">
                  AI Assistant • Online (It is normal that each response takes roughly 1 minute)
                </p>
              </div>
            </div>

            <!-- Responsive chat area using dynamic height calculation -->
            <q-scroll-area ref="scrollArea" class="chat-area">
              <div class="q-pa-md">
                <!-- Use v-for without key on template, apply keys to the actual elements instead -->
                <template v-for="(message, index) in messages">
                  <q-chat-message
                    v-if="message.type === 'user'"
                    :key="'user-' + index"
                    :text="[message.content]"
                    sent
                    text-color="white"
                    bg-color="primary"
                  >
                    <template v-slot:name>You</template>
                    <template v-slot:stamp>{{ message.timestamp }}</template>
                  </q-chat-message>

                  <q-chat-message v-else :key="'bot-' + index" bg-color="grey-3">
                    <template v-slot:name>Yao</template>
                    <template v-slot:stamp>{{ message.timestamp }}</template>
                    <div v-html="formatThinkContent(message.content)"></div>
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
        <div class="col-12 col-lg-4 col-md-5">
          <q-card class="contact-section">
            <q-card-section>
              <h2 class="text-primary q-mt-none q-mb-md">Get in Touch</h2>
              <p>Leave your details and I'll personally reach out to you soon.</p>

              <q-form @submit="onSubmit" class="q-gutter-md" v-if="!submitted">
                <q-input
                  v-model="formData.name"
                  label="Full Name *"
                  required
                  :rules="[(val) => !!val || 'Name is required']"
                />

                <q-input v-model="formData.company" label="Company Name" />

                <q-input
                  v-model="formData.email"
                  label="Email Address *"
                  type="email"
                  required
                  :rules="[
                    (val) => !!val || 'Email is required',
                    (val) =>
                      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(val) ||
                      'Please enter a valid email',
                  ]"
                />

                <q-input v-model="formData.phone" label="Phone Number" type="tel" />

                <q-input
                  v-model="formData.note"
                  label="Your Message"
                  type="textarea"
                  rows="4"
                  placeholder="How can I help you?"
                />

                <div>
                  <q-btn label="Send Message" type="submit" color="accent" class="full-width" />
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
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { ASK_FIREBASE, HEALTH_QUERY } from '../graphql/queries'
import { executeGraphQL } from '../graphql/apollo-client'

export default {
  name: 'IndexPage',

  setup() {
    const $q = useQuasar()
    const scrollArea = ref(null)
    const messages = ref([
      {
        type: 'bot',
        content: "Hello! I'm the virtual assistant for Yao Xiao. How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    const newMessage = ref('')
    const loading = ref(false)

    const formData = ref({
      name: '',
      company: '',
      email: '',
      phone: '',
      note: '',
    })
    const submitted = ref(false)

    // Responsive height management
    const updateChatAreaHeight = () => {
      if (!scrollArea.value) return
      
      const isMobile = window.innerWidth < 600
      const isTablet = window.innerWidth >= 600 && window.innerWidth < 1024
      
      // Dynamic height calculation based on screen size
      if (isMobile) {
        scrollArea.value.$el.style.height = '350px'
      } else if (isTablet) {
        scrollArea.value.$el.style.height = '400px'
      } else {
        scrollArea.value.$el.style.height = '450px'
      }
    }

    // Set up resize listener for responsive behavior
    onMounted(() => {
      window.addEventListener('resize', updateChatAreaHeight)
      // Initial call to set height
      nextTick(() => {
        updateChatAreaHeight()
      })
    })

    onUnmounted(() => {
      window.removeEventListener('resize', updateChatAreaHeight)
    })

    const formatTimestamp = () => {
      return new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    
    const formatThinkContent = (content) => {
      if (!content) return '';
      
      // Check if the content contains <think> tags
      if (content.includes('<think>') && content.includes('</think>')) {
        // Extract think content and main content using regex
        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>\s*([\s\S]*)/);
        
        if (thinkMatch) {
          const thinkContent = thinkMatch[1];
          const mainContent = thinkMatch[2] || '';
          
          // Return formatted HTML with think content in grey and main content in black
          return `<span style="color: #9e9e9e; font-style: italic;">&lt;think&gt;${thinkContent}&lt;/think&gt;</span>
                  <span style="color: black;">${mainContent}</span>`;
        }
      }
      
      // If no <think> tags or match fails, return original content
      return content;
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
          timestamp: formatTimestamp(),
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

          // Make GraphQL mutation call for the actual message
          console.log('STEP 5: Sending query to GraphQL API')
          const response = await executeGraphQL(ASK_FIREBASE, {
            query: userMessage,
            // limit: 5  // Adding a limit parameter (optional, adjust as needed)
          })

          console.log('STEP 6: Received GraphQL response:', response)

          if (response?.data?.askFirebase?.status === 'success') {
            console.log('STEP 7: Adding successful bot response')
            messages.value.push({
              type: 'bot',
              content: response.data.askFirebase.answer,
              timestamp: formatTimestamp(),
            })

            // Log retrieval sources if available
            if (response.data.askFirebase.sources) {
              console.log('Retrieval sources:', response.data.askFirebase.sources)
            }
          } else {
            console.error('STEP 8: Bot response indicates failure')
            throw new Error(response?.data?.askFirebase?.message || 'Unknown GraphQL error')
          }

        } catch (graphqlError) {
          console.error('GraphQL Error:', graphqlError)
          console.log('STEP FALLBACK: Using fallback response due to GraphQL error')

          // Add fallback response if GraphQL fails
          messages.value.push({
            type: 'bot',
            content:
              "I received your message, but I'm having trouble connecting to my knowledge base. The development team has been notified of this issue.",
            timestamp: formatTimestamp(),
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
          timestamp: formatTimestamp(),
        })

        // Only show notification if Quasar is properly initialized
        $q.notify({
          type: 'negative',
          message: 'Failed to send message. Please try again.',
          position: 'top',
        })

        await scrollToBottom()
      } finally {
        loading.value = false
        console.log('STEP FINAL: Message handling process completed')
      }
    }

    const onSubmit = async () => {
      try {
        // Import the contact store dynamically to prevent circular dependencies
        const { useContactStore } = await import('../stores/contact-store')
        const contactStore = useContactStore()

        console.log('Submitting form via contact store:', formData.value)

        // Submit the form using the store
        const success = await contactStore.submitContactForm(formData.value)

        if (success) {
          submitted.value = true
          $q.notify({
            type: 'positive',
            message: "Thank you for your message! We'll get back to you soon.",
            position: 'top',
          })
        } else {
          $q.notify({
            type: 'negative',
            message: contactStore.error || 'Failed to submit contact form. Please try again.',
            position: 'top',
          })
        }
      } catch (error) {
        console.error('Error in contact form submission:', error)
        $q.notify({
          type: 'negative',
          message: 'An error occurred while submitting the form. Please try again.',
          position: 'top',
        })
      }
    }

    return {
      scrollArea,
      messages,
      newMessage,
      sendMessage,
      loading,
      formData,
      submitted,
      onSubmit,
      formatThinkContent,
    }
  },
}
</script>

<style lang="scss">
/* Using global styles to ensure chat components are responsive */
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

/* Make profile header responsive on very small screens */
@media (max-width: 400px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 10px;
  }
  
  .profile-header .q-avatar {
    margin-right: 0 !important;
    margin-bottom: 10px;
  }
  
  .profile-status {
    font-size: 12px !important;
  }
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
  min-height: 200px; /* Ensure a minimum height */
}

.message-input {
  border-top: 1px solid #eee;
}

.contact-section {
  height: 100%;
}

/* Chat messages responsive adjustments */
@media (max-width: 600px) {
  .q-message-text {
    max-width: 80vw !important;
  }
  
  .profile-name {
    font-size: 16px;
  }
  
  /* Adjust container padding on small screens */
  .q-page {
    padding: 8px !important;
  }
  
  /* Reduce header spacing on mobile */
  header.text-center {
    padding: 10px 0 !important;
    margin-bottom: 12px !important;
  }
  
  /* Smaller heading on mobile */
  header h1 {
    font-size: 1.5rem;
  }
}
</style>