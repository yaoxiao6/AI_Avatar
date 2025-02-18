# rag.py
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
from flask import Flask, request, jsonify
import json

set_debug(True)
set_verbose(True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class ChatPDF:
    """A class for handling PDF ingestion and question answering using RAG."""

    def __init__(self, llm_model: str = "deepseek-r1:1.5B", embedding_model: str = "mxbai-embed-large"):
        self.model = ChatOllama(model=llm_model)
        self.embeddings = OllamaEmbeddings(model=embedding_model)
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

    def ingest(self, pdf_file_path: str) -> dict:
        """Ingest a PDF file and return status"""
        try:
            logger.info(f"Starting ingestion for file: {pdf_file_path}")
            docs = PyPDFLoader(file_path=pdf_file_path).load()
            chunks = self.text_splitter.split_documents(docs)
            chunks = filter_complex_metadata(chunks)

            self.vector_store = Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings,
                persist_directory="chroma_db",
            )
            logger.info("Ingestion completed successfully")
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

# Initialize ChatPDF instance
chat_pdf = ChatPDF()

# Flask routes to handle requests from the Node.js server
@app.route('/ingest', methods=['POST'])
def ingest_document():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No file selected"}), 400

    # Save the file temporarily
    temp_path = f"/tmp/{file.filename}"
    file.save(temp_path)
    
    # Process the file
    result = chat_pdf.ingest(temp_path)
    return jsonify(result)

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.json
    if not data or 'query' not in data:
        return jsonify({"status": "error", "message": "No query provided"}), 400
    
    result = chat_pdf.ask(
        data['query'],
        k=data.get('k', 5),
        score_threshold=data.get('score_threshold', 0.2)
    )
    return jsonify(result)

@app.route('/clear', methods=['POST'])
def clear_store():
    result = chat_pdf.clear()
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000)
