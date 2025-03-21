#!/bin/bash

set -e

mkdir -p circuits/credential/instances

# Define keys and corresponding values
hash_algs_keys=("sha1" "sha224" "sha256" "sha384" "sha512")
hash_algs_values=(160 224 256 384 512)

# Iterate over the arrays
for i in "${!hash_algs_keys[@]}"; do
    alg="${hash_algs_keys[$i]}"
    int_value="${hash_algs_values[$i]}"
    filename="circuits/credential/instances/credential_${alg}.circom"

    cat > "$filename" << EOF
pragma circom 2.1.9;

include "../credential.circom";

component main { public [templateRoot, issuanceDate, currentDate] } = DG1FieldParser(${int_value}, 10, 15);
EOF

    echo "Created $filename"
done

echo "All credential files have been generated successfully!"
