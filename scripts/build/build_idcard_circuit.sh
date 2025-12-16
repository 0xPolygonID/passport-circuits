#!/bin/bash

source "scripts/build/common.sh"

# Circuit-specific configurations
CURR_DIR=$(pwd)
CIRCUIT_TYPE="idcard"
OUTPUT_DIR="${CURR_DIR}/build/${CIRCUIT_TYPE}"
PACKAGE_DIR="${CURR_DIR}/package/${CIRCUIT_TYPE}"

libs() {
    echo "node_modules node_modules/@openpassport node_modules/circomlib/circuits"
}

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    "idcard_sha1:18:true"
    "idcard_sha224:18:true"
    "idcard_sha256:18:true"
    "idcard_sha384:18:true"
    "idcard_sha512:18:true"
)

LIBS=$(libs)
build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$LIBS" "${CIRCUITS[@]}" 
build_circuit_graphs "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$LIBS" "${CIRCUITS[@]}"
