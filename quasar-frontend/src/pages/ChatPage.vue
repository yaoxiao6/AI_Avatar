<!-- AI_Avatar/quasar-frontend/src/pages/ChatPage.vue -->

<template>
  <div class="q-pa-md row justify-center">
    <div class="chat-container" style="width: 100%; max-width: 600px;">
      <!-- Chat messages area -->
      <q-scroll-area
        ref="scrollArea"
        style="height: 400px; border-radius: 4px; border: 1px solid #ddd"
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
              <template v-slot:name>Me</template>
              <template v-slot:stamp>{{ message.timestamp }}</template>
            </q-chat-message>

            <q-chat-message
              v-else
              :text="[message.content]"
              bg-color="grey-3"
            >
              <template v-slot:name>Bot</template>
              <template v-slot:stamp>{{ message.timestamp }}</template>
            </q-chat-message>
          </template>
        </div>
      </q-scroll-area>

      <!-- Input area -->
      <div class="q-pa-md">
        <div class="row q-pa-sm">
          <q-input
            v-model="newMessage"
            dense
            outlined
            class="col"
            placeholder="Type your message"
            @keyup.enter="sendMessage"
            :loading="loading"
          >
            <template v-slot:append>
              <q-btn
                round
                dense
                flat
                icon="send"
                @click="sendMessage"
                :disable="!newMessage.trim() || loading"
              />
            </template>
          </q-input>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { ASK_QUESTION } from '../graphql/queries'
import { executeGraphQL } from '../graphql/apollo-client'

export default {
  setup () {
    const $q = useQuasar()
    const scrollArea = ref(null)
    const messages = ref([])
    const newMessage = ref('')
    const loading = ref(false)

    const formatTimestamp = () => {
      return new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    const scrollToBottom = async () => {
      await nextTick()
      const scrollEl = scrollArea.value.getScroll()
      scrollArea.value.setScrollPosition('vertical', scrollEl.verticalSize)
    }

    const sendMessage = async () => {
      if (!newMessage.value.trim() || loading.value) return

      loading.value = true
      console.log('Sending message:', newMessage.value)

      try {
        // Add user message
        messages.value.push({
          type: 'user',
          content: newMessage.value,
          timestamp: formatTimestamp()
        })

        // Store message and clear input
        const userMessage = newMessage.value
        newMessage.value = ''

        // Scroll to bottom after user message
        await scrollToBottom()

        // Make GraphQL mutation call using the executeGraphQL function
        const response = await executeGraphQL(ASK_QUESTION, {
          query: userMessage,
          k: 5,
          scoreThreshold: 0.2
        })

        console.log('GraphQL response:', response)

        // Add bot response
        if (response.data.askQuestion.status === 'success') {
          messages.value.push({
            type: 'bot',
            content: response.data.askQuestion.answer,
            timestamp: formatTimestamp()
          })
        } else {
          throw new Error(response.data.askQuestion.message)
        }

        await scrollToBottom()
      } catch (error) {
        console.error('Error sending message:', error)
        
        // Show error notification
        $q.notify({
          type: 'negative',
          message: 'Failed to send message. Please try again.',
          position: 'top'
        })

        messages.value.push({
          type: 'bot',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: formatTimestamp()
        })
      } finally {
        loading.value = false
      }
    }

    return {
      scrollArea,
      messages,
      newMessage,
      sendMessage,
      loading
    }
  }
}
</script>

<style lang="sass">
.chat-container
  display: flex
  flex-direction: column
  height: 500px
  background: white
  border-radius: 8px
  box-shadow: 0 1px 5px rgba(0,0,0,0.2)
</style>