import { sha224, sha256 } from 'js-sha256';
import { sha1 } from 'js-sha1';
import { sha384, sha512 } from 'js-sha512';
import { hexToSignedBytes, packBytesArray } from './bytes';
import * as forge from 'node-forge';
import { Poseidon } from '@iden3/js-crypto';

export function flexiblePoseidon(inputs: bigint[]): bigint {
  return Poseidon.spongeHashX(inputs, inputs.length);
}

// hash function - crypto is not supported in react native
export function hash(
  hashFunction: string,
  bytesArray: number[],
  format: string = 'bytes'
): string | number[] {
  const unsignedBytesArray = bytesArray.map((byte) => byte & 0xff);
  let hashResult: string;

  switch (hashFunction) {
    case 'sha1':
      hashResult = sha1(unsignedBytesArray);
      break;
    case 'sha224':
      hashResult = sha224(unsignedBytesArray);
      break;
    case 'sha256':
      hashResult = sha256(unsignedBytesArray);
      break;
    case 'sha384':
      hashResult = sha384(unsignedBytesArray);
      break;
    case 'sha512':
      hashResult = sha512(unsignedBytesArray);
      break;
    default:
      console.log('\x1b[31m%s\x1b[0m', `${hashFunction} not found in hash`); // Log in red
      throw new Error(`Hash function ${hashFunction} not supported`);
  }
  if (format === 'hex') {
    return hashResult;
  }
  if (format === 'bytes') {
    return hexToSignedBytes(hashResult);
  }
  if (format === 'binary') {
    return forge.util.binary.raw.encode(new Uint8Array(hexToSignedBytes(hashResult)));
  }
  throw new Error(`Invalid format: ${format}`);
}

export function getHashLen(hashFunction: string) {
  switch (hashFunction) {
    case 'sha1':
      return 20;
    case 'sha224':
      return 28;
    case 'sha256':
      return 32;
    case 'sha384':
      return 48;
    case 'sha512':
      return 64;
    default:
      throw new Error(`Hash function ${hashFunction} not supported`);
  }
}

export function customHasher(pubKeyFormatted: string[]) {
  if (pubKeyFormatted.length < 16) {
    // if k is less than 16, we can use a single poseidon hash
    return flexiblePoseidon(pubKeyFormatted.map(BigInt)).toString();
  } else {
    const rounds = Math.ceil(pubKeyFormatted.length / 16); // do up to 16 rounds of poseidon
    if (rounds > 16) {
      throw new Error('Number of rounds is greater than 16');
    }
    const hash = new Array(rounds);
    for (let i = 0; i < rounds; i++) {
      hash[i] = { inputs: new Array(16).fill(BigInt(0)) };
    }
    for (let i = 0; i < rounds; i++) {
      for (let j = 0; j < 16; j++) {
        if (i * 16 + j < pubKeyFormatted.length) {
          hash[i].inputs[j] = BigInt(pubKeyFormatted[i * 16 + j]);
        }
      }
    }
    const finalHash = flexiblePoseidon(hash.map((h) => Poseidon.spongeHashX(h.inputs, 16)));
    return finalHash.toString();
  }
}

export function packBytesAndPoseidon(unpacked: number[]) {
  const packed = packBytesArray(unpacked);
  return customHasher(packed.map(String)).toString();
}
