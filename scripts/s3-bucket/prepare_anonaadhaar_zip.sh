#!/bin/bash

source "$(dirname "$0")/common.sh"

mkdir -p "$DST"

# Handle anonAadhaarV1
mkdir -p "$DST/anonAadhaarV1"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/anonAadhaarV1_final.zkey" "$DST/anonAadhaarV1/anonAadhaarV1.zkey"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/anonAadhaarV1_vkey.json" "$DST/anonAadhaarV1/"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/anonAadhaarV1_graph.wcd" "$DST/anonAadhaarV1/anonAadhaarV1.wcd"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/Verifier_anonAadhaarV1.sol" "$DST/anonAadhaarV1/"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/anonAadhaarV1_js/"*.wasm "$DST/anonAadhaarV1/anonAadhaarV1.wasm"
# Fix contract name in Verifier_anonAadhaarV1.sol
sed -i '' 's/Verifier_anonAadhaarV1/Verifier_anon_aadhaar_v1/g' "$DST/anonAadhaarV1/Verifier_anonAadhaarV1.sol"

# Zip anonAadhaarV1
cd "$DST"
zip -r "anonAadhaarV1.zip" "anonAadhaarV1"
cd ..
