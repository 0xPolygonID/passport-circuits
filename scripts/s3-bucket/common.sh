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
    local PACKAGE_DIR=$5
    local START_TIME=$(date +%s)

    echo -e "${BLUE}Getting files for circuit: $CIRCUIT_NAME${NC}"
       
    echo -e "${BLUE}Copying files${NC}"
    # Create package directory
    mkdir -p ${S3_DIR}/keys/${CIRCUIT_NAME}/
    mkdir -p ${S3_DIR}/r1cs/${CIRCUIT_NAME}/
    mkdir -p ${S3_DIR}/witness-calc/${CIRCUIT_NAME}/

    # Copy .r1cs, .zkey and vkey.json to s3 folder
    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs \
        ${S3_DIR}/r1cs/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey \
        ${S3_DIR}/keys/${CIRCUIT_NAME}/circuit_final.zkey

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_vkey.json \
        ${S3_DIR}/keys/${CIRCUIT_NAME}/verification_vkey.json

    cp ${PACKAGE_DIR}/${CIRCUIT_NAME}/bin/${CIRCUIT_NAME} \
        ${S3_DIR}/witness-calc/${CIRCUIT_NAME}/${CIRCUIT_NAME}

    cp ${PACKAGE_DIR}/${CIRCUIT_NAME}/bin/${CIRCUIT_NAME}.dat \
        ${S3_DIR}/witness-calc/${CIRCUIT_NAME}/${CIRCUIT_NAME}.dat

    # Print build statistics
    echo -e "${GREEN}Copy of $CIRCUIT_NAME completed in $(($(date +%s) - START_TIME)) seconds${NC}"
}

files_circuits() {
    local CIRCUITS=("$@")
    local CIRCUIT_TYPE="$1"
    local S3_DIR="$2"
    local BUILD_DIR="$3"
    local PACKAGE_DIR="$4"
    shift 2 
    local TOTAL_START_TIME=$(date +%s)

    # Build circuits
    for circuit in "${CIRCUITS[@]}"; do
        IFS=':' read -r CIRCUIT_NAME <<< "$circuit"
        if [[ ${CIRCUIT_NAME} == *"${CIRCUIT_TYPE}_"* ]]; then
            # Build circuit
            echo -e "${BLUE}Getting files for circuit $CIRCUIT_NAME${NC}"
            files_circuit "$CIRCUIT_NAME" "$CIRCUIT_TYPE" "$S3_DIR" "$BUILD_DIR" "$PACKAGE_DIR"
        fi
    done

    echo -e "${GREEN}Total completed in $(($(date +%s) - TOTAL_START_TIME)) seconds${NC}"
}


files_credential_circuit() {
    local CIRCUIT_NAME=$1
    local CIRCUIT_TYPE=$2
    local S3_DIR=$3
    local BUILD_DIR=$4
    local START_TIME=$(date +%s)

    echo -e "${BLUE}Getting files for circuit: $CIRCUIT_NAME${NC}"
       
    echo -e "${BLUE}Copying files${NC}"
    # Create package directory
    mkdir -p ${S3_DIR}/credential-keys/${CIRCUIT_NAME}/
    mkdir -p ${S3_DIR}/r1cs/${CIRCUIT_NAME}/

    # Copy .r1cs, .zkey and vkey.json to s3 folder
    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs \
        ${S3_DIR}/r1cs/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey \
        ${S3_DIR}/credential-keys/${CIRCUIT_NAME}/circuit_final.zkey

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm \
        ${S3_DIR}/credential-keys/${CIRCUIT_NAME}/circuit.wasm

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_vkey.json \
        ${S3_DIR}/credential-keys/${CIRCUIT_NAME}/verification_vkey.json

    # TODO (illia-korotia): we have to upload wcd files for client circuits to s3
    
    # Print build statistics
    echo -e "${GREEN}Copy of $CIRCUIT_NAME completed in $(($(date +%s) - START_TIME)) seconds${NC}"
}

files_credential_circuits() {
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
            files_credential_circuit "$CIRCUIT_NAME" "$CIRCUIT_TYPE" "$S3_DIR" "$BUILD_DIR"
        fi
    done

    echo -e "${GREEN}Total completed in $(($(date +%s) - TOTAL_START_TIME)) seconds${NC}"
}