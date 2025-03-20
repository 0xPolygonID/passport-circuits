#!/bin/bash

source "scripts/s3-bucket/common.sh"

# Circuit-specific configurations
CIRCUIT_TYPE="dsc"
S3_DIR="s3-bucket/${CIRCUIT_TYPE}"
BUILD_DIR="build/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:build_flag
CIRCUITS=(
    # ECDSA circuits
    "dsc_sha1_ecdsa_brainpoolP256r1"
    "dsc_sha256_ecdsa_brainpoolP256r1"
    "dsc_sha256_ecdsa_brainpoolP384r1"
    "dsc_sha256_ecdsa_secp256r1"
    "dsc_sha256_ecdsa_secp384r1"
    "dsc_sha384_ecdsa_brainpoolP384r1"
    "dsc_sha384_ecdsa_brainpoolP512r1"
    "dsc_sha384_ecdsa_secp384r1"
    "dsc_sha512_ecdsa_brainpoolP512r1"

    # RSA circuits
    "dsc_sha1_rsa_65537_4096"
    "dsc_sha256_rsa_65537_4096"
    "dsc_sha512_rsa_65537_4096"

    # RSA-PSS circuits
    "dsc_sha256_rsapss_3_32_3072"
    "dsc_sha256_rsapss_65537_32_3072"
    "dsc_sha256_rsapss_65537_32_4096"
    "dsc_sha512_rsapss_65537_64_4096"
)

files_circuits "$CIRCUIT_TYPE" "$S3_DIR" "$BUILD_DIR" "${CIRCUITS[@]}" 