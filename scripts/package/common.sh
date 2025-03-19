#!/bin/bash

# Common colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color


package_circuit() {
    local CIRCUIT_NAME=$1
    local CIRCUIT_TYPE=$2
    local BUILD_DIR=$3
    local OUTPUT_DIR=$4
    local START_TIME=$(date +%s)

    echo -e "${BLUE}Generating witnesscalc package for circuit: $CIRCUIT_NAME${NC}"
    
    # Create output directory
    mkdir -p ${OUTPUT_DIR}/${CIRCUIT_NAME}/
    
    # Set circuit path based on CIRCUIT_TYPE
    local CIRCUIT_PATH
    if [ "$CIRCUIT_TYPE" = "dsc" ] || [ "$CIRCUIT_TYPE" = "signature" ] ; then
        CIRCUIT_PATH="circuits/${CIRCUIT_TYPE}/instances/${CIRCUIT_NAME}.circom"
    else
        CIRCUIT_PATH="circuits/${CIRCUIT_TYPE}/${CIRCUIT_NAME}.circom"
    fi

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs \
        ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_cpp/${CIRCUIT_NAME}.cpp \
        ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.cpp

    cp ${BUILD_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_cpp/${CIRCUIT_NAME}.dat \
        ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.dat

    echo -e "${BLUE}Copied ${CIRCUIT_NAME} build files${NC}"

    cd witnesscalc-template
    rm -rf build_witnesscalc
    ./build_gmp.sh host
    mkdir build_witnesscalc && cd build_witnesscalc
    cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=../../package/${CIRCUIT_TYPE}/${CIRCUIT_NAME} -DCIRCUIT_FILE=../../${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.cpp
    make -j 8 && make install
    cd ../..
}

package_circuits() {
    local CIRCUITS=("$@")
    local CIRCUIT_TYPE="$1"
    local BUILD_DIR="$2"
    local OUTPUT_DIR="$3"
    shift 2 
    local TOTAL_START_TIME=$(date +%s)

    # Package circuits
    for circuit in "${CIRCUITS[@]}"; do
        IFS=':' read -r CIRCUIT_NAME PACKAGE_FLAG <<< "$circuit"
        if [ "$PACKAGE_FLAG" = "true" ]; then
            # Package circuit
            echo -e "${BLUE}Packaging circuit $CIRCUIT_NAME${NC}"
            package_circuit "$CIRCUIT_NAME" "$CIRCUIT_TYPE" "$BUILD_DIR" "$OUTPUT_DIR"
        else
            echo -e "${GRAY}Skipping package for $CIRCUIT_NAME${NC}"
        fi
    done

    echo -e "${GREEN}Total completed in $(($(date +%s) - TOTAL_START_TIME)) seconds${NC}"
}