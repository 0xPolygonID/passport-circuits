#!/bin/bash

source "$(dirname "$0")/common.sh"

mkdir -p "$DST/keys"

cp "$SRC/anonAadhaarV1/anonAadhaarV1/"*_vkey.json "$DST/keys/"

for dir in "$SRC/credential"/credential_sha*; do
    cp "$dir/"*_vkey.json "$DST/keys/"
done

cd "$DST"
zip -r "keys.zip" "keys"
cd ..
