#!/bin/bash

source "scripts/build/common.sh"

# Circuit-specific configurations
CURR_DIR=$(pwd)
CIRCUIT_TYPE="credential"
OUTPUT_DIR="${CURR_DIR}/build/${CIRCUIT_TYPE}"
PACKAGE_DIR="${CURR_DIR}/package/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    "credential_sha1:20:false"
    "credential_sha224:20:false"
    "credential_sha256:20:true"
    "credential_sha384:20:false"
    "credential_sha512:20:false"
)

build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "${CIRCUITS[@]}" 
build_circuit_graphs "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$CURR_DIR" "${CIRCUITS[@]}" 
