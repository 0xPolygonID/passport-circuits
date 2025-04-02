#!/bin/bash

source "scripts/s3-bucket/common.sh"

# Circuit-specific configurations
CIRCUIT_TYPE="signature"
S3_DIR="s3-bucket"
PACKAGE_DIR="package/${CIRCUIT_TYPE}"
BUILD_DIR="build/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:build_flag
CIRCUITS=(
    # ECDSA circuits
    "signature_sha1_sha1_sha1_ecdsa_brainpoolP224r1"
    "signature_sha224_sha224_sha224_ecdsa_brainpoolP224r1"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP256r1"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP384r1"
    "signature_sha256_sha256_sha256_ecdsa_secp256r1"
    "signature_sha256_sha256_sha256_ecdsa_secp384r1"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP384r1"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP512r1"
    "signature_sha384_sha384_sha384_ecdsa_secp384r1"
    "signature_sha512_sha512_sha512_ecdsa_brainpoolP512r1"
    
    # RSA circuits
    "signature_sha1_sha1_sha1_rsa_65537_4096"
    "signature_sha1_sha256_sha256_rsa_65537_4096"
    "signature_sha256_sha256_sha256_rsa_65537_4096"
    "signature_sha512_sha512_sha512_rsa_65537_4096"

    # RSA-PSS circuits
    "signature_sha256_sha256_sha256_rsapss_3_32_2048"
    "signature_sha256_sha256_sha256_rsapss_65537_32_2048"
    "signature_sha256_sha256_sha256_rsapss_65537_32_3072"
    "signature_sha384_sha384_sha384_rsapss_65537_48_2048"
    "signature_sha512_sha512_sha512_rsapss_65537_64_2048"
)

files_circuits "$CIRCUIT_TYPE" "$S3_DIR" "$BUILD_DIR" "$PACKAGE_DIR" "${CIRCUITS[@]}" 