#!/bin/bash

set -e

VERSION="v1.0.2"
BASE_URL="https://privadoid-passport-circuits.s3.eu-west-1.amazonaws.com/${VERSION}"
CREDENTIAL_DIR="./build/credential"
ANON_AADHAAR_DIR="./build/anonAadhaarV1"

# Create target directories
mkdir -p "${CREDENTIAL_DIR}"
mkdir -p "${ANON_AADHAAR_DIR}"

# List of credential circuit zips
CREDENTIAL_ZIPS=(
  # "credential_sha1.zip"
  # "credential_sha224.zip"
  "credential_sha256.zip"
  # "credential_sha384.zip"
  # "credential_sha512.zip"
)

# Download and unzip credential circuits
for zip in "${CREDENTIAL_ZIPS[@]}"; do
  curl -L "${BASE_URL}/${zip}" -o "${CREDENTIAL_DIR}/${zip}"
  unzip -o "${CREDENTIAL_DIR}/${zip}" -d "${CREDENTIAL_DIR}"
  rm "${CREDENTIAL_DIR}/${zip}"
done

# Download and unzip anonAadhaarV1 circuit
curl -L "${BASE_URL}/anonAadhaarV1.zip" -o "${ANON_AADHAAR_DIR}/anonAadhaarV1.zip"
unzip -o "${ANON_AADHAAR_DIR}/anonAadhaarV1.zip" -d "${ANON_AADHAAR_DIR}"
rm "${ANON_AADHAAR_DIR}/anonAadhaarV1.zip"

