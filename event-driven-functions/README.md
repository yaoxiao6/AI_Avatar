# PDF Ingestion Cloud Function

This Cloud Function is automatically deployed as part of the backend deployment pipeline. It processes PDF files uploaded to a specific Cloud Storage bucket and forwards them to the RAG service for ingestion.

## Architecture

1. Upload a PDF file to the `pdfs/` folder in the Cloud Storage bucket (`ai-avatar-451519-storage`)
2. The Cloud Function is triggered automatically by this upload event
3. The Function downloads the PDF, then sends it to the Flask RAG service for processing
4. The RAG service extracts and indexes the content

## Manual Testing

To test the function manually:

1. Make sure all services are deployed (Ollama, Flask RAG, Node Backend)
2. Upload a PDF file to the bucket:

```bash
# Create a sample PDF if needed
echo "This is a test PDF" > test.pdf

# Upload to the bucket
gsutil cp test.pdf gs://ai-avatar-451519-storage/pdfs/
```

3. Check the Cloud Function logs:

```bash
gcloud functions logs read ingest-pdf --gen2 --region=us-central1
```

## Customization

To modify the function behavior, edit the following:

- **PDF Folder Path**: Change the `PDF_FOLDER` environment variable in Terraform or GitHub Actions
- **API Endpoint**: The function automatically uses the deployed Flask RAG service URL
- **Memory/Timeout**: Adjust resources in the Terraform configuration as needed

## Troubleshooting

If the function fails to process PDFs:

1. Check the Cloud Function logs for errors
2. Verify the Flask RAG service is accessible and the `/ingest` endpoint is working
3. Ensure the service account has proper permissions to access the storage bucket and the RAG service
4. For large PDFs, you may need to increase the function timeout or memory

## Local Development

For local development and testing:

```bash
# Set environment variables
export API_ENDPOINT="https://flask-rag-ai-avatar-451519.a.run.app/ingest"
export PDF_FOLDER="pdfs/"

# Install dependencies
pip install -r requirements.txt

# Run function locally (using Functions Framework)
functions-framework --target=process_pdf --signature-type=cloudevent
```

Then use a tool like `curl` or Postman to send a simulated Cloud Storage event to your local function.