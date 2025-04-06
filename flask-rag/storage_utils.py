#!/usr/bin/env python3
# AI_Avatar/flask-rag/storage_utils.py

import os
import logging
import shutil
import tempfile
from google.cloud import storage
from pathlib import Path
import tarfile
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CloudStorageManager:
    """A class to manage syncing between local storage and Google Cloud Storage."""
    
    def __init__(self, bucket_name, local_path="chroma_db"):
        """Initialize the storage manager.
        
        Args:
            bucket_name (str): The name of the Google Cloud Storage bucket
            local_path (str): The local path to sync with Cloud Storage
        """
        self.bucket_name = bucket_name
        self.local_path = local_path
        self.client = storage.Client()
        self.bucket = self._get_or_create_bucket()
        
        # Ensure local directory exists
        os.makedirs(self.local_path, exist_ok=True)

    def _get_or_create_bucket(self):
        """Get or create the GCS bucket."""
        try:
            bucket = self.client.get_bucket(self.bucket_name)
            logger.info(f"Bucket {self.bucket_name} already exists")
        except Exception:
            logger.info(f"Creating new bucket {self.bucket_name}")
            bucket = self.client.create_bucket(self.bucket_name)
        return bucket
    
    def _create_tarball(self):
        """Create a tarball of the local directory."""
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
            tar.add(self.local_path, arcname=os.path.basename(self.local_path))
        
        tar_buffer.seek(0)
        return tar_buffer
    
    def _extract_tarball(self, tarball_content):
        """Extract a tarball to the local directory."""
        # Create a BytesIO object from the tarball content
        tar_buffer = io.BytesIO(tarball_content)
        
        # Remove existing directory if it exists
        if os.path.exists(self.local_path):
            shutil.rmtree(self.local_path)
        
        # Extract the tarball
        with tarfile.open(fileobj=tar_buffer, mode="r:gz") as tar:
            tar.extractall(path=os.path.dirname(self.local_path))
    
    def download_from_cloud(self):
        """Download and restore the Chroma DB from Cloud Storage."""
        blob_name = f"{os.path.basename(self.local_path)}.tar.gz"
        blob = self.bucket.blob(blob_name)
        
        try:
            # Check if the blob exists
            if not blob.exists():
                logger.info(f"No existing data found in Cloud Storage at {blob_name}")
                return False
            
            # Download the tarball
            logger.info(f"Downloading Chroma DB from Cloud Storage")
            blob_content = blob.download_as_bytes()
            
            # Extract the tarball
            self._extract_tarball(blob_content)
            logger.info(f"Successfully restored Chroma DB from Cloud Storage")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading Chroma DB from Cloud Storage: {str(e)}")
            return False
    
    def upload_to_cloud(self):
        """Upload the Chroma DB to Cloud Storage."""
        try:
            # Check if the local directory exists and has content
            if not os.path.exists(self.local_path) or not os.listdir(self.local_path):
                logger.warning(f"No data to upload: {self.local_path} is empty or doesn't exist")
                return False
            
            # Create a tarball
            tar_buffer = self._create_tarball()
            
            # Upload to Cloud Storage
            blob_name = f"{os.path.basename(self.local_path)}.tar.gz"
            blob = self.bucket.blob(blob_name)
            blob.upload_from_file(tar_buffer)
            
            logger.info(f"Successfully uploaded Chroma DB to Cloud Storage as {blob_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error uploading Chroma DB to Cloud Storage: {str(e)}")
            return False