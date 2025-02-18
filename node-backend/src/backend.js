
// GraphQL schema
const schema = buildSchema(`
  type Query {
    health: String
  }

  type Mutation {
    ingestDocument(file: Upload!): IngestResponse!
    askQuestion(query: String!, k: Int, scoreThreshold: Float): AskResponse!
    clearVectorStore: ClearResponse!
  }

  type IngestResponse {
    status: String!
    message: String
  }

  type AskResponse {
    status: String!
    answer: String
    message: String
    metadata: ResponseMetadata
  }

  type ResponseMetadata {
    contextFound: Boolean
    numChunksRetrieved: Int
  }

  type ClearResponse {
    status: String!
    message: String
  }

  scalar Upload
`);

// Configure Python service URL
const PYTHON_SERVICE_URL = 'http://localhost:5000';

// Resolver functions
const root = {
  health: () => 'OK',

  ingestDocument: async ({ file }) => {
    try {
      const { createReadStream, filename } = await file;
      const stream = createReadStream();
      
      // Create form data
      const formData = new FormData();
      formData.append('file', stream, filename);

      // Send to Python service
      const response = await axios.post(`${PYTHON_SERVICE_URL}/ingest`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error during ingestion:', error);
      return {
        status: 'error',
        message: error.message || 'Error during document ingestion'
      };
    }
  },

  askQuestion: async ({ query, k = 5, scoreThreshold = 0.2 }) => {
    try {
      const response = await axios.post(`${PYTHON_SERVICE_URL}/ask`, {
        query,
        k,
        score_threshold: scoreThreshold
      });

      return response.data;
    } catch (error) {
      console.error('Error during question:', error);
      return {
        status: 'error',
        message: error.message || 'Error processing question'
      };
    }
  },

  clearVectorStore: async () => {
    try {
      const response = await axios.post(`${PYTHON_SERVICE_URL}/clear`);
      return response.data;
    } catch (error) {
      console.error('Error clearing vector store:', error);
      return {
        status: 'error',
        message: error.message || 'Error clearing vector store'
      };
    }
  }
};

// Create Express server
const app = express();

// GraphQL endpoint
app.use('/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true // Enable GraphiQL interface for testing
  })
);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GraphQL server running at http://localhost:${PORT}/graphql`);
});
