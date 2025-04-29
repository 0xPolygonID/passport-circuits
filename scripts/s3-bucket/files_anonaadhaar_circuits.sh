#!/bin/bash

source "scripts/s3-bucket/common.sh"

# Circuit-specific configurations
CIRCUIT_TYPE="anonAadhaarV1"
S3_DIR="s3-bucket"
BUILD_DIR="build/${CIRCUIT_TYPE}"

# Define circuits and their configurations
CIRCUITS=(
    "anonAadhaarV1"
)

# Copy files to S3 bucket
for CIRCUIT in "${CIRCUITS[@]}"; do
    DEST_DIR="${S3_DIR}/${CIRCUIT_TYPE}/${CIRCUIT}"
    copy_circuit_files "$CIRCUIT" "$BUILD_DIR" "$DEST_DIR"
done