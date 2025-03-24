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

build_circuit_graph() {
    local CIRCUIT_NAME=$1
    local CIRCUIT_TYPE=$2
    local OUTPUT_DIR=$3
    local START_TIME=$(date +%s)

    echo -e "${BLUE}Compiling circuit: $CIRCUIT_NAME${NC}"
    
    # Create output directory
    mkdir -p ${OUTPUT_DIR}/${CIRCUIT_NAME}/
    
    # Set circuit path based on CIRCUIT_TYPE
    local CIRCUIT_PATH
    if [ "$CIRCUIT_TYPE" = "dsc" ] || [ "$CIRCUIT_TYPE" = "signature" ] || [ "$CIRCUIT_TYPE" = "credential" ] ; then
        CIRCUIT_PATH="${CURR_DIR}/circuits/${CIRCUIT_TYPE}/instances/${CIRCUIT_NAME}.circom"
    else
        CIRCUIT_PATH="circuits/${CIRCUIT_TYPE}/${CIRCUIT_NAME}.circom"
    fi
    
    local circuit_graph_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_graph.wcd"
	local witness_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.wtns"
	local proof_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_proof.json"
	local public_signals_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_public.json"
	local r1cs_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs"

    cd circom-witnesscalc
    time target/release/build-circuit "$CIRCUIT_PATH" "$circuit_graph_path" -l ${CURR_DIR}/node_modules
}

build_circuit_graphs() {
    local CIRCUITS=("$@")
    local CIRCUIT_TYPE="$1"
    local OUTPUT_DIR="$2"
    local PACKAGE_DIR="$3"
    shift 2 
    local TOTAL_START_TIME=$(date +%s)

    # Build circuits
    for circuit in "${CIRCUITS[@]}"; do
        IFS=':' read -r CIRCUIT_NAME POWEROFTAU BUILD_FLAG <<< "$circuit"
        if [ "$BUILD_FLAG" = "true" ]; then
            # Build circuit
            echo -e "${BLUE}Building circuit graph $CIRCUIT_NAME${NC}"
            build_circuit_graph "$CIRCUIT_NAME" "$CIRCUIT_TYPE" "$OUTPUT_DIR"
        else
            echo -e "${GRAY}Skipping build for $CIRCUIT_NAME${NC}"
        fi
    done

    echo -e "${GREEN}Total completed in $(($(date +%s) - TOTAL_START_TIME)) seconds${NC}"
}

build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "${CIRCUITS[@]}" 
build_circuit_graphs "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "${CIRCUITS[@]}" 
