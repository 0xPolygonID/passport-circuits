#!/bin/bash

source "$(dirname "$0")/common.sh"

PKG_DST="$DST/package"
mkdir -p "$PKG_DST"

# Copy anonAadhaarV1 files
mkdir -p "$PKG_DST/anonAadhaarV1"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/"*.r1cs "$PKG_DST/anonAadhaarV1/"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/anonAadhaarV1_cpp/"*.cpp "$PKG_DST/anonAadhaarV1/"
cp "$SRC/anonAadhaarV1/anonAadhaarV1/anonAadhaarV1_cpp/"*.dat "$PKG_DST/anonAadhaarV1/"

# Copy credential_shaX files
for dir in "$SRC/credential"/credential_sha*; do
    hash_alg=$(basename "$dir" | sed -E 's/credential_sha([a-zA-Z0-9]+)/\1/')
    outdir="$PKG_DST/credential_sha$hash_alg"
    mkdir -p "$outdir"
    cp "$dir/"*.r1cs "$outdir/"
    cp "$dir/"*_cpp/*.cpp "$outdir/"
    cp "$dir/"*_cpp/*.dat "$outdir/"
done

cd "$DST"
zip -r "package.zip" "package"
cd ..