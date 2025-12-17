#!/bin/bash

set -e

# Circuit type to generate instances for (e.g., "credential", "idcard")
if [ -z "$CIRCUIT_TYPE" ]; then
    echo "Error: CIRCUIT_TYPE environment variable is not set"
    echo "Usage: CIRCUIT_TYPE=credential|idcard $0"
    exit 1
fi

mkdir -p circuits/${CIRCUIT_TYPE}/instances

# Define keys and corresponding values
hash_algs_keys=("sha1" "sha224" "sha256" "sha384" "sha512")
hash_algs_values=(160 224 256 384 512)

# Iterate over the arrays
for i in "${!hash_algs_keys[@]}"; do
    alg="${hash_algs_keys[$i]}"
    int_value="${hash_algs_values[$i]}"
    filename="circuits/${CIRCUIT_TYPE}/instances/${CIRCUIT_TYPE}_${alg}.circom"

    cat > "$filename" << EOF
pragma circom 2.1.9;

include "../${CIRCUIT_TYPE}.circom";

component main { public [currentDate, issuanceDate, templateRoot, issuer, revocationNonce] } = DG1FieldParser(${int_value}, 8, 14);
EOF

    echo "Created $filename"
done

echo "All credential files have been generated successfully!"
