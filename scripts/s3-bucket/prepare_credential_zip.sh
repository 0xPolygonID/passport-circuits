#!/bin/bash

source "$(dirname "$0")/common.sh"

# Handle credential_shaX
for dir in "$SRC/credential"/credential_sha*; do
    hash_alg=$(basename "$dir" | sed -E 's/credential_sha([a-zA-Z0-9]+)/\1/')
    outdir="$DST/credential_sha$hash_alg"
    mkdir -p "$outdir"
    cp "$dir/credential_sha${hash_alg}_final.zkey" "$outdir/credential_sha${hash_alg}.zkey"
    cp "$dir/credential_sha${hash_alg}_vkey.json" "$outdir/"
    cp "$dir/credential_sha${hash_alg}_graph.wcd" "$outdir/credential_sha${hash_alg}.wcd"
    cp "$dir/Verifier_credential_sha${hash_alg}.sol" "$outdir/"
    cp "$dir/credential_sha${hash_alg}_js/"*.wasm "$outdir/credential_sha${hash_alg}.wasm"
    # Zip the directory
    cd "$DST"
    zip -r "credential_sha${hash_alg}.zip" "credential_sha${hash_alg}"
    cd ..
done
