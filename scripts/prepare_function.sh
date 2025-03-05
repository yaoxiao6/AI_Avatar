#!/bin/bash

# Script to prepare and upload Cloud Function source code

# Environment variables
PROJECT_ID=${1:-"ai-avatar-451519"}
REGION=${2:-"us-central1"}
SOURCE_DIR="event-driven-functions"
TEMP_DIR="/tmp/function-source"
SOURCE_BUCKET="${PROJECT_ID}-source-code"

echo "Preparing Cloud Function source code..."

# Create temporary directory
mkdir -p $TEMP_DIR
cp $SOURCE_DIR/ingest_pdf.py $TEMP_DIR/main.py
cp $SOURCE_DIR/requirements.txt $TEMP_DIR/

# Create ZIP archive
cd $TEMP_DIR
zip -r function-source.zip .
cd -

# Ensure the source bucket exists
gsutil mb -l $REGION -p $PROJECT_ID gs://$SOURCE_BUCKET || true

# Upload ZIP to Cloud Storage
gsutil cp $TEMP_DIR/function-source.zip gs://$SOURCE_BUCKET/

# Clean up
rm -rf $TEMP_DIR

echo "Cloud Function source code prepared and uploaded to gs://$SOURCE_BUCKET/function-source.zip"