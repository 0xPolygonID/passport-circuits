#!/bin/bash

source "scripts/package/common.sh"

# Circuit-specific configurations
CIRCUIT_TYPE="signature"
BUILD_DIR="build/${CIRCUIT_TYPE}"
PACKAGE_DIR="package/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    # ECDSA circuits
    "signature_sha1_sha1_sha1_ecdsa_brainpoolP224r1:false"
    # "signature_sha1_sha1_sha1_ecdsa_secp256r1:21:false" # Instance not found
    "signature_sha224_sha224_sha224_ecdsa_brainpoolP224r1:false"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP256r1:false"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP384r1:true"
    "signature_sha256_sha256_sha256_ecdsa_secp256r1:false"
    "signature_sha256_sha256_sha256_ecdsa_secp384r1:false"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP384r1:true"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP512r1:true"
    "signature_sha384_sha384_sha384_ecdsa_secp384r1:true"
    "signature_sha512_sha512_sha512_ecdsa_brainpoolP512r1:true"

    # RSA circuits
    "signature_sha1_sha1_sha1_rsa_65537_4096:true"
    # "signature_sha1_sha1_sha1_rsa_65537_2048:20:false" # Instance not found
    "signature_sha1_sha256_sha256_rsa_65537_4096:false"
    # "signature_sha256_sha256_sha256_rsa_65537_3072:false" # Instance not found
    "signature_sha256_sha256_sha256_rsa_65537_4096:false"
    "signature_sha512_sha512_sha512_rsa_65537_4096:false"

    # RSA-PSS circuits
    "signature_sha256_sha256_sha256_rsapss_3_32_2048:false"
    "signature_sha256_sha256_sha256_rsapss_65537_32_2048:false"
    "signature_sha256_sha256_sha256_rsapss_65537_32_3072:false"
    "signature_sha384_sha384_sha384_rsapss_65537_48_2048:false"
    "signature_sha512_sha512_sha512_rsapss_65537_64_2048:false"
)

package_circuits "$CIRCUIT_TYPE" "$BUILD_DIR" "$PACKAGE_DIR" "${CIRCUITS[@]}" º