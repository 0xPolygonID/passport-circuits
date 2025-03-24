#!/bin/bash

source "scripts/build/common.sh"

# Circuit-specific configurations
CIRCUIT_TYPE="credential"
OUTPUT_DIR="build/${CIRCUIT_TYPE}"
PACKAGE_DIR="package/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    "credential_sha1:20:true"
    "credential_sha224:20:false"
    "credential_sha256:20:false"
    "credential_sha384:20:false"
    "credential_sha512:20:false"
)

build_circuit() {
    local CIRCUIT_NAME=$1
    local CIRCUIT_TYPE=$2
    local POWEROFTAU=$3
    local OUTPUT_DIR=$4
    local PACKAGE_DIR=$5
    local START_TIME=$(date +%s)

    echo -e "${BLUE}Compiling circuit: $CIRCUIT_NAME${NC}"
    
    # Create output directory
    mkdir -p ${OUTPUT_DIR}/${CIRCUIT_NAME}/
    
    # Set circuit path based on CIRCUIT_TYPE
    local CIRCUIT_PATH
    if [ "$CIRCUIT_TYPE" = "dsc" ] || [ "$CIRCUIT_TYPE" = "signature" ] || [ "$CIRCUIT_TYPE" = "credential" ] ; then
        CIRCUIT_PATH="circuits/${CIRCUIT_TYPE}/instances/${CIRCUIT_NAME}.circom"
    else
        CIRCUIT_PATH="circuits/${CIRCUIT_TYPE}/${CIRCUIT_NAME}.circom"
    fi
    
    local circuit_graph_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_graph.wcd"
	local witness_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.wtns"
	local proof_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_proof.json"
	local public_signals_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_public.json"
	local r1cs_path="${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs"

    cd circom-witnesscalc
    time ./build-circuit "$CIRCUIT_PATH" "$circuit_graph_path" \ 
        -l node_modules \
        -l ./node_modules/@zk-kit/binary-merkle-root.circom/src \
        -l ./node_modules/circomlib/circuits
	time ./calc-witness "$circuit_graph_path" "$inputs_path" "$witness_path"

    # Compile circuit
    # circom ${CIRCUIT_PATH} \
    #     -l node_modules \
    #     -l ./node_modules/@zk-kit/binary-merkle-root.circom/src \
    #     -l ./node_modules/circomlib/circuits \
    #     --r1cs --O1 --wasm -c \
    #     --output ${OUTPUT_DIR}/${CIRCUIT_NAME}/

    # echo -e "${BLUE}Copying package files${NC}"
    # # Create package directory
    # mkdir -p ${PACKAGE_DIR}/${CIRCUIT_NAME}/

    # # Copy .cpp .dat and .r1cs to package
    # cp ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs \
    #     ${PACKAGE_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs

    # cp ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_cpp/${CIRCUIT_NAME}.cpp \
    #     ${PACKAGE_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.cpp

    # cp ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_cpp/${CIRCUIT_NAME}.dat \
    #     ${PACKAGE_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.dat


    # echo -e "${BLUE}Building zkey${NC}"
    # NODE_OPTIONS="--max-old-space-size=40960" yarn snarkjs groth16 setup \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs \
    #     build/powersOfTau28_hez_final_${POWEROFTAU}.ptau \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.zkey
    
    # # Generate and contribute random string
    # local RAND_STR=$(get_random_string)
    # echo $RAND_STR | yarn snarkjs zkey contribute \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.zkey \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey

    # echo -e "${BLUE}Building vkey${NC}"
    # yarn snarkjs zkey export verificationkey \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_vkey.json

    # # Generate and copy Solidity verifier
    # yarn snarkjs zkey export solidityverifier \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey \
    #     ${OUTPUT_DIR}/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol

    # OS=""

    # case "$(uname)" in
    # 'Darwin')
    #     OS='Mac'
    #     ;;
    # 'Linux')
    #     OS='Linux'
    #     ;;
    # *)
    #     echo "Unsupported platform: $(uname -a)"
    #     exit 1
    #     ;;
    # esac

    # if [ "$OS" = 'Mac' ]; then
    #     sed -i '' "s/Groth16Verifier/Verifier_${CIRCUIT_NAME}/g" \
    #         ${OUTPUT_DIR}/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol
    # elif [ "$OS" = 'Linux' ]; then
    #     sed -i "s/Groth16Verifier/Verifier_${CIRCUIT_NAME}/g" \
    #         ${OUTPUT_DIR}/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol
    # fi

    # # Copy verifier to contracts directory
    # mkdir -p ./contracts/verifiers/${CIRCUIT_TYPE}/
    # cp ${OUTPUT_DIR}/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol \
    #     ./contracts/verifiers/${CIRCUIT_TYPE}/Verifier_${CIRCUIT_NAME}.sol
    
    # echo -e "${BLUE}Copied Verifier_${CIRCUIT_NAME}.sol to contracts${NC}"

    # # Print build statistics
    # echo -e "${GREEN}Build of $CIRCUIT_NAME completed in $(($(date +%s) - START_TIME)) seconds${NC}"
    # echo -e "${BLUE}Size of ${CIRCUIT_NAME}.r1cs: $(wc -c < ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs) bytes${NC}"
    # echo -e "${BLUE}Size of ${CIRCUIT_NAME}.wasm: $(wc -c < ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm) bytes${NC}"
    # echo -e "${BLUE}Size of ${CIRCUIT_NAME}_final.zkey: $(wc -c < ${OUTPUT_DIR}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey) bytes${NC}"
}

build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "$PACKAGE_DIR" "${CIRCUITS[@]}" 