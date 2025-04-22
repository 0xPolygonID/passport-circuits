#!/bin/bash

source "scripts/build/common.sh"

# Circuit-specific configurations
CIRCUIT_TYPE="signature"
OUTPUT_DIR="build/${CIRCUIT_TYPE}"
PACKAGE_DIR="package/${CIRCUIT_TYPE}"

libs() {
    echo "node_modules node_modules/@zk-kit/binary-merkle-root.circom/src node_modules/circomlib/circuits"
}
# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    # ECDSA circuits
    "signature_sha1_sha1_sha1_ecdsa_brainpoolP224r1:22:false"
    "signature_sha1_sha1_sha1_ecdsa_secp256r1:21:false"
    "signature_sha224_sha224_sha224_ecdsa_brainpoolP224r1:22:false"
    "signature_sha256_sha224_sha224_ecdsa_secp224r1:22:false"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP256r1:22:false"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP384r1:23:false"
    "signature_sha256_sha256_sha256_ecdsa_secp256r1:22:false"
    "signature_sha256_sha256_sha256_ecdsa_secp384r1:23:false"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP384r1:23:false"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP512r1:24:false"
    "signature_sha384_sha384_sha384_ecdsa_secp384r1:23:false"
    "signature_sha512_sha512_sha512_ecdsa_brainpoolP512r1:24:false"
    "signature_sha512_sha512_sha512_ecdsa_secp521r1:24:false"
    
    # RSA circuits
    "signature_sha1_sha1_sha1_rsa_65537_4096:20:false"
    # "signature_sha1_sha1_sha1_rsa_65537_2048:20:false" # Instance not found
    "signature_sha1_sha256_sha256_rsa_65537_4096:20:false"
    # "signature_sha256_sha256_sha256_rsa_65537_3072:20:false" # Instance not found
    "signature_sha256_sha256_sha256_rsa_65537_4096:20:true"
    "signature_sha256_sha256_sha256_rsa_3_4096:20:false"
    "signature_sha512_sha512_sha256_rsa_65537_4096:21:false"
    "signature_sha512_sha512_sha512_rsa_65537_4096:21:false"

    # RSA-PSS circuits
    "signature_sha256_sha256_sha256_rsapss_3_32_2048:21:false"
    "signature_sha256_sha256_sha256_rsapss_65537_32_2048:21:false"
    "signature_sha256_sha256_sha256_rsapss_65537_32_3072:21:false"
    "signature_sha256_sha256_sha256_rsapss_65537_64_2048:22:false"
    "signature_sha384_sha384_sha384_rsapss_65537_48_2048:22:false"
    "signature_sha512_sha512_sha512_rsapss_65537_64_2048:22:false"
)

LIBS=$(libs)
build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$LIBS" "${CIRCUITS[@]}" 