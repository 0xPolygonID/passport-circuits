#!/bin/bash

# Common colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

files_circuit() {
    local CIRCUIT_NAME=$1
    local CIRCUIT_TYPE=$2
    local S3_DIR=$3
    local BUILD_DIR=$4
    local START_TIME=$(date +%s)

    echo -e "${BLUE}Getting files for circuit: $CIRCUIT_NAME${NC}"
    
    # Create s3 directory
    mkdir -p ${S3_DIR}/${CIRCUIT_NAME}/
    
    echo -e "${BLUE}Copying files${NC}"
    # Create package directory
    mkdir -p ${S3_DIR}/${CIRCUIT_NAME}/

    # Copy .r1cs, .zkey and vkey.json to s3 folder
    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs \
        ${S3_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey \
        ${S3_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_vkey.json \
        ${S3_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_vkey.json

    # Print build statistics
    echo -e "${GREEN}Copy of $CIRCUIT_NAME completed in $(($(date +%s) - START_TIME)) seconds${NC}"
}

files_circuits() {
    local CIRCUITS=("$@")
    local CIRCUIT_TYPE="$1"
    local S3_DIR="$2"
    local BUILD_DIR="$3"
    shift 2 
    local TOTAL_START_TIME=$(date +%s)

    # Build circuits
    for circuit in "${CIRCUITS[@]}"; do
        IFS=':' read -r CIRCUIT_NAME <<< "$circuit"
        if [[ ${CIRCUIT_NAME} == *"${CIRCUIT_TYPE}_"* ]]; then
            # Build circuit
            echo -e "${BLUE}Getting files for circuit $CIRCUIT_NAME${NC}"
            files_circuit "$CIRCUIT_NAME" "$CIRCUIT_TYPE" "$S3_DIR" "$BUILD_DIR"
        fi
    done

    echo -e "${GREEN}Total completed in $(($(date +%s) - TOTAL_START_TIME)) seconds${NC}"
}