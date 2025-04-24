#!/bin/bash

source "scripts/build/common.sh"

# Siquence of dependencies is important
# If two libraries provide the same function, the first one will be used
# and the second one will be ignored
libs() {
    echo "scripts/build/deps node_modules"
}

# Circuit-specific configurations
CURR_DIR=$(pwd)
CIRCUIT_TYPE="anonAadhaarV1"
OUTPUT_DIR="${CURR_DIR}/build/${CIRCUIT_TYPE}"
PACKAGE_DIR="${CURR_DIR}/package/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    "anonAadhaarV1:21:false"
)

LIBS=$(libs)
build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$LIBS" "${CIRCUITS[@]}" 
build_circuit_graphs "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "$LIBS" "${CIRCUITS[@]}"
