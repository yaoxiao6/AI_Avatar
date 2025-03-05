# AI_Avatar/event-driven-functions/ingest_pdf.py

import os
import base64
import json
import requests
import functions_framework
from google.cloud import storage

# Get the API endpoint from environment variables or use the default
API_ENDPOINT = os.environ.get("API_ENDPOINT", "https://flask-rag-579795762739.us-central1.run.app/ingest")

@functions_framework.cloud_event
def process_pdf(cloud_event):
    """
    Cloud Function triggered by a Cloud Storage event.
    This function gets triggered when a new file is added to the specified bucket and folder.
    
    Args:
        cloud_event (CloudEvent): The Cloud Event that triggered the function.
    """
    # Parse the cloud event data
    data = cloud_event.data
    
    # Get bucket and file information from the event
    bucket_name = data["bucket"]
    file_name = data["name"]
    
    # Check if the file is in the correct folder and is a PDF
    pdf_folder = os.environ.get("PDF_FOLDER", "pdfs/")  # Default to "pdfs/" if not specified
    
    if not file_name.startswith(pdf_folder):
        print(f"File {file_name} is not in the specified folder {pdf_folder}. Skipping.")
        return
    
    if not file_name.lower().endswith(".pdf"):
        print(f"File {file_name} is not a PDF. Skipping.")
        return
    
    # Download the PDF file from the bucket
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    
    # Download as bytes
    pdf_content = blob.download_as_bytes()
    
    # Send the PDF to the API endpoint
    files = {
        'file': (os.path.basename(file_name), pdf_content, 'application/pdf')
    }
    
    try:
        response = requests.post(API_ENDPOINT, files=files)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        
        print(f"Successfully sent {file_name} to the API. Response: {response.text}")
        return f"Successfully processed {file_name}"
        
    except requests.exceptions.RequestException as e:
        print(f"Error sending {file_name} to the API: {str(e)}")
        raise e