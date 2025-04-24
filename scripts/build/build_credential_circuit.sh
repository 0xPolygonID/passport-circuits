#!/bin/bash

source "scripts/build/common.sh"

# Circuit-specific configurations
CURR_DIR=$(pwd)
CIRCUIT_TYPE="credential"
OUTPUT_DIR="${CURR_DIR}/build/${CIRCUIT_TYPE}"
PACKAGE_DIR="${CURR_DIR}/package/${CIRCUIT_TYPE}"

libs() {
    echo "node_modules node_modules/@openpassport node_modules/circomlib/circuits"
}

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    "credential_sha1:18:false"
    "credential_sha224:18:false"
    "credential_sha256:18:false"
    "credential_sha384:18:false"
    "credential_sha512:18:false"
)

LIBS=$(libs)
build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$LIBS" "${CIRCUITS[@]}" 
build_circuit_graphs "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$LIBS" "${CIRCUITS[@]}"
