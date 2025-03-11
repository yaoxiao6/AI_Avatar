# AI_Avatar/flask-rag/rag_module.py

from langchain_core.globals import set_verbose, set_debug
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain.schema.output_parser import StrOutputParser
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema.runnable import RunnablePassthrough
from langchain_community.vectorstores.utils import filter_complex_metadata
from langchain_core.prompts import ChatPromptTemplate
import logging
import chromadb
import os

set_debug(True)
set_verbose(True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Ollama host and port from environment variables
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', f"http://ollama-server:11434")  # defaults to 'http://ollama-server:11434' if not set

class ChatPDF:
    """A class for handling PDF ingestion and question answering using RAG."""

    def __init__(self, llm_model: str = "deepseek-r1:1.5B", embedding_model: str = "mxbai-embed-large"):
        self.model = ChatOllama(model=llm_model, base_url=OLLAMA_BASE_URL)
        self.embeddings = OllamaEmbeddings(model=embedding_model, base_url=OLLAMA_BASE_URL)
        
        # Test the embedding model to make sure it's working
        try:
            test_embedding = self.embeddings.embed_query("test query")
            logger.info(f"Embedding test successful! Dimension: {len(test_embedding)}")
        except Exception as e:
            logger.error(f"Embedding test failed: {str(e)}")
            raise
            
        # Modified chunk settings for better retrieval
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,  # Smaller chunk size
            chunk_overlap=200  # Larger overlap
        )
        
        # Improved prompt with better context handling
        self.prompt = ChatPromptTemplate.from_template(
            """
            You are the representater of Yao, who is applying jobs. 
            You will answer questions from a recruiter. 
            You are provided with context information from a PDF document about Yao's resume, work experience, and education.
            
            Context information is below:
            ---------------------
            {context}
            ---------------------
            
            Given the context information and not prior knowledge, answer the question: {question}
            
            If the answer cannot be determined from the context, say "I don't have enough information to answer that based on the document."
            Answer concisely and accurately in three sentences or less.
            Speak as if you are Yao, the candidate.
            """
        )
        self.vector_store = None
        self.retriever = None
        self.client = chromadb.PersistentClient(path="chroma_db")

    def ingest(self, pdf_file_path: str) -> dict:
        """Ingest a PDF file and return status"""
        try:
            logger.info(f"rag_module: Starting ingestion for file: {pdf_file_path}")
            docs = PyPDFLoader(file_path=pdf_file_path).load()
            chunks = self.text_splitter.split_documents(docs)
            chunks = filter_complex_metadata(chunks)
            
            logger.info(f"Created {len(chunks)} chunks from document")
            logger.info(f"Example chunk content: {chunks[0].page_content[:100]}...")
            
            self.vector_store = Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings,
                client=self.client,
            )

            # Get and log the size of the vector store
            collection_size = self.vector_store._collection.count()
            logger.info(f"Vector store size: {collection_size} documents")

            logger.info("Ingestion in rag_module completed successfully")
            return {"status": "success", "message": f"Document ingested successfully. Created {len(chunks)} chunks."}
        except Exception as e:
            logger.error(f"Error during ingestion: {str(e)}")
            return {"status": "error", "message": str(e)}

    def ask(self, query: str, k: int = 5, score_threshold: float = 0.2) -> dict:
        """Answer a query and return response with metadata"""
        try:
            if not self.vector_store:
                raise ValueError("No vector store found. Please ingest a document first.")

            # Create a new retriever with updated parameters each time
            self.retriever = self.vector_store.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={"k": k, "score_threshold": score_threshold},
            )

            logger.info(f"Retrieving context for query: {query}")
            logger.info(f"Using retrieval parameters: k={k}, score_threshold={score_threshold}")
            
            retrieved_docs = self.retriever.invoke(query)
            
            # Log similarity scores for debugging
            if retrieved_docs:
                logger.info(f"Retrieved {len(retrieved_docs)} relevant chunks")
                for i, doc in enumerate(retrieved_docs):
                    if hasattr(doc, 'metadata') and 'score' in doc.metadata:
                        logger.info(f"Doc {i} score: {doc.metadata['score']}")
            else:
                logger.warning(f"No documents retrieved above threshold {score_threshold}")

            if not retrieved_docs:
                return {
                    "status": "success",
                    "answer": "No relevant information found in the document to answer your question.",
                    "metadata": {"context_found": False}
                }

            formatted_input = {
                "context": "\n\n".join(doc.page_content for doc in retrieved_docs),
                "question": query,
            }

            chain = (
                RunnablePassthrough()
                | self.prompt
                | self.model
                | StrOutputParser()
            )

            response = chain.invoke(formatted_input)
            return {
                "status": "success",
                "answer": response,
                "metadata": {
                    "context_found": True,
                    "num_chunks_retrieved": len(retrieved_docs)
                }
            }
        except Exception as e:
            logger.error(f"Error during query: {str(e)}")
            return {"status": "error", "message": str(e)}

    def clear(self) -> dict:
        """Clear the vector store and return status"""
        try:
            logger.info("Clearing vector store and retriever")
            self.vector_store = None
            self.retriever = None
            return {"status": "success", "message": "Vector store cleared successfully"}
        except Exception as e:
            logger.error(f"Error clearing vector store: {str(e)}")
            return {"status": "error", "message": str(e)}