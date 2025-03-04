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
          <div class="chat-section">
            <div class="profile-header">
              <q-avatar size="60px" class="q-mr-md">
                <img src="~assets/your-profile.jpg" alt="Profile Picture">
              </q-avatar>
              <div class="profile-info">
                <h2 class="profile-name q-ma-none">Yao Xiao</h2>
                <p class="profile-status q-ma-none q-mt-sm">AI Assistant • Online</p>
              </div>
            </div>
            
            <div class="chat-area" ref="chatArea">
              <div v-for="(message, index) in messages" :key="index" 
                  :class="['message', message.sender === 'user' ? 'user-message' : 'bot-message']">
                <div class="message-bubble">
                  {{ message.text }}
                </div>
              </div>
            </div>
            
            <div class="message-input">
              <q-input 
                v-model="messageInput" 
                placeholder="Type your message here..." 
                outlined 
                rounded 
                dense
                class="full-width"
                @keyup.enter="sendMessage"
              />
              <q-btn 
                round 
                color="accent" 
                icon="send" 
                size="md"
                class="q-ml-sm"
                @click="sendMessage"
              />
            </div>
          </div>
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
export default {
  name: 'IndexPage',
  
  data() {
    return {
      messages: [
        {
          sender: 'bot',
          text: 'Hello! I\'m the virtual assistant for [Yao Xiao]. How can I help you today?'
        }
      ],
      messageInput: '',
      formData: {
        name: '',
        company: '',
        email: '',
        phone: '',
        note: ''
      },
      submitted: false
    }
  },
  
  methods: {
    sendMessage() {
      const message = this.messageInput.trim();
      if (message !== '') {
        // Add user message
        this.messages.push({
          sender: 'user',
          text: message
        });
        
        this.messageInput = '';
        
        // Simulate bot typing delay
        setTimeout(() => {
          // Replace with actual AI response logic
          let response = "Thank you for your message! I'm an AI assistant, so I'll pass this along. If you'd like a personal response, please fill out the contact form.";
          this.messages.push({
            sender: 'bot',
            text: response
          });
          
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }, 1000);
      }
    },
    
    scrollToBottom() {
      const chatArea = this.$refs.chatArea;
      chatArea.scrollTop = chatArea.scrollHeight;
    },
    
    onSubmit() {
      // Here you would typically send the form data to your backend
      // For now, we'll just show the success message
      this.submitted = true;
      
      // You can connect this to axios or apollo client to send the data
      console.log('Form submitted:', this.formData);
    }
  },
  
  updated() {
    this.scrollToBottom();
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
  height: 400px;
  overflow-y: auto;
  padding: 20px;
  background-color: #f9f9f9;
}

.message {
  margin-bottom: 15px;
  display: flex;
}

.user-message {
  justify-content: flex-end;
}

.bot-message {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 18px;
  font-size: 15px;
}

.user-message .message-bubble {
  background-color: $primary;
  color: white;
  border-top-right-radius: 4px;
}

.bot-message .message-bubble {
  background-color: #e9e9e9;
  border-top-left-radius: 4px;
}

.message-input {
  display: flex;
  align-items: center;
  padding: 15px;
  border-top: 1px solid #eee;
}

.contact-section {
  height: 100%;
}
</style>