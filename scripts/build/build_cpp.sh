#!/bin/bash

# run from root
# first argument should signature | dsc | disclose
if [[  $1 != "signature" && $1 != "dsc" && $1 != "disclose" ]]; then
    echo "first argument should be signature | dsc | disclose"
    exit 1
fi

SIGNATURE_CIRCUITS=(
    "signature_sha1_sha1_sha1_ecdsa_brainpoolP224r1:false"
    "signature_sha1_sha1_sha1_ecdsa_secp256r1:false"
    "signature_sha1_sha1_sha1_rsa_65537_2048:false"
    "signature_sha1_sha256_sha256_rsa_65537_4096:true"
    "signature_sha256_sha224_sha224_ecdsa_brainpoolP224r1:false"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP224r1:false"
    "signature_sha256_sha256_sha256_ecdsa_brainpoolP256r1:true"
    "signature_sha256_sha256_sha256_ecdsa_secp256r1:false"
    "signature_sha256_sha256_sha256_ecdsa_secp384r1:false"
    "signature_sha256_sha256_sha256_rsa_65537_3072:false"
    "signature_sha256_sha256_sha256_rsa_65537_4096:true"
    "signature_sha256_sha256_sha256_rsapss_3_32_4096:false"
    "signature_sha256_sha256_sha256_rsapss_65537_4096:false"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP256r1:false"
    "signature_sha384_sha384_sha384_ecdsa_brainpoolP384r1:false"
    "signature_sha384_sha384_sha384_ecdsa_secp384r1:false"
    "signature_sha512_sha512_sha512_ecdsa_brainpoolP256r1:false"
    "signature_sha512_sha512_sha512_ecdsa_brainpoolP384r1:false"
    "signature_sha512_sha512_sha512_ecdsa_brainpoolP512r1:false"
    "signature_sha512_sha512_sha512_rsa_65537_4096:false"
)

DISCLOSE_CIRCUITS=(
    "vc_and_disclose:true"
)

DSC_CIRCUITS=(
    # ECDSA circuits
    "dsc_sha1_ecdsa_brainpoolP256r1:false"
    "dsc_sha256_ecdsa_brainpoolP224r1:false"
    "dsc_sha256_ecdsa_brainpoolP256r1:false"
    "dsc_sha256_ecdsa_brainpoolP384r1:false"
    "dsc_sha256_ecdsa_secp256r1:false"
    "dsc_sha256_ecdsa_secp384r1:false"
    "dsc_sha384_ecdsa_brainpoolP384r1:false"
    "dsc_sha384_ecdsa_brainpoolP512r1:false"
    "dsc_sha384_ecdsa_secp384r1:false"
    "dsc_sha512_ecdsa_brainpoolP512r1:false"

    # RSA circuits
    "dsc_sha1_rsa_65537_4096:false"
    "dsc_sha256_rsa_65537_4096:true"
    "dsc_sha512_rsa_65537_4096:false"

    # RSA-PSS circuits
    "dsc_sha256_rsapss_3_32_3072:false"
    "dsc_sha256_rsapss_65537_32_3072:false"
    "dsc_sha256_rsapss_65537_32_4096:false"
    "dsc_sha512_rsapss_65537_64_4096:false"
)

if [[ $1 == "signature" ]]; then
    allowed_circuits=("${SIGNATURE_CIRCUITS[@]}")
    output="output/signature"
    mkdir -p $output
    basepath="./circuits/circuits/signature/instances"
elif [[ $1 == "dsc" ]]; then
    allowed_circuits=("${DSC_CIRCUITS[@]}")
    output="output/dsc"
    mkdir -p $output
    basepath="./circuits/circuits/dsc/instances"
elif [[ $1 == "disclose" ]]; then
    allowed_circuits=("${DISCLOSE_CIRCUITS[@]}")
    output="output/disclose"
    mkdir -p $output
    basepath="./circuits/circuits/disclose"
fi

pids=() 
for item in "${allowed_circuits[@]}"; do
    filename=$(echo "$item" | cut -d':' -f1)
    allowed=$(echo "$item" | cut -d':' -f2)

    if [[ $allowed == 'false' ]]; then
        echo "Skipping $filename (not in allowed circuits)"
        continue
    fi

    echo $filename $allowed
    filepath=${basepath}/${filename}.circom
    circom_pid=$!
    circuit_name="${filename%.*}"
    (
        circom $filepath \
        -l "circuits/node_modules" \
        -l "circuits/node_modules/@zk-kit/binary-merkle-root.circom/src" \
        -l "circuits/node_modules/circomlib/circuits" \
        --O1 -c --output $output && \
        cd $output/${circuit_name}_cpp && \
        make 
    ) & 
    pids+=($!)
done

echo "Waiting for all circuits to compile..."
wait "${pids[@]}"
echo "All circuits compiled successfully!"
