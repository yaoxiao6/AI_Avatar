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
        # try:
        #     self.embeddings = OllamaEmbeddings(model=embedding_model, base_url=OLLAMA_BASE_URL)
        #     # Test the embeddings with a simple string
        #     # test_embedding = self.embeddings.embed_query("test")
        #     logger.info("Embedding model initialized successfully")
        # except Exception as e:
        #     logger.error(f"Failed to initialize embedding model: {str(e)}")
        #     raise

        # embeddings = OllamaEmbeddings(model="mxbai-embed-large")
        # try:
        #     test_embedding = embeddings.embed_query("test")
        #     logger.info("Embedding successful!")
        #     logger.info(f"Embedding dimension: {len(test_embedding)}")
        # except Exception as e:
        #     logger.error(f"Failed to embed query: {str(e)}")
        #     raise
        
        self.model = ChatOllama(model=llm_model, base_url=OLLAMA_BASE_URL)
        self.embeddings = OllamaEmbeddings(model=embedding_model, base_url=OLLAMA_BASE_URL)
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1024, chunk_overlap=100)
        self.prompt = ChatPromptTemplate.from_template(
            """
            You are a helpful assistant answering questions based on the uploaded document.
            Context: {context}
            Question: {question}
            Answer concisely and accurately in three sentences or less.
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
            # print(f"Number of chunks: {len(chunks)}")
            # print(f"Example chunk: {chunks[0]}")
            logger.info(f"rag_module -> function ingest -> self.embeddings: {self.embeddings}")
            self.vector_store = Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings,
                client=self.client,
            )

            logger.info("Ingestion in rag_module completed successfully")
            return {"status": "success", "message": "Document ingested successfully"}
        except Exception as e:
            logger.error(f"Error during ingestion: {str(e)}")
            return {"status": "error", "message": str(e)}

    def ask(self, query: str, k: int = 5, score_threshold: float = 0.2) -> dict:
        """Answer a query and return response with metadata"""
        try:
            if not self.vector_store:
                raise ValueError("No vector store found. Please ingest a document first.")

            if not self.retriever:
                self.retriever = self.vector_store.as_retriever(
                    search_type="similarity_score_threshold",
                    search_kwargs={"k": k, "score_threshold": score_threshold},
                )

            logger.info(f"Retrieving context for query: {query}")
            retrieved_docs = self.retriever.invoke(query)

            if not retrieved_docs:
                return {
                    "status": "success",
                    "answer": "No relevant context found in the document to answer your question.",
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