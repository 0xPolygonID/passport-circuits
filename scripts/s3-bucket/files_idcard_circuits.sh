#!/bin/bash

source "scripts/s3-bucket/common.sh"

# Circuit-specific configurations
CIRCUIT_TYPE="idcard"
S3_DIR="s3-bucket"
BUILD_DIR="build/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:build_flag
CIRCUITS=(
    "idcard_sha1"
    "idcard_sha224"
    "idcard_sha256"
    "idcard_sha384"
    "idcard_sha512"
)

files_credential_circuits "$CIRCUIT_TYPE" "$S3_DIR" "$BUILD_DIR" "${CIRCUITS[@]}" 