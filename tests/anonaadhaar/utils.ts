import { ffUtils } from '@iden3/js-crypto';

// bytesToIntChunks cats array in the same way as js-crypto does
// but it doesn't implement poseidonSponge hash:
// https://github.com/iden3/js-crypto/blob/116bdb3a576303d87c5c83e13ebc8016e5689699/src/poseidon/poseidon-opt.ts#L87
export function bytesToIntChunks(bytes: Uint8Array): bigint[] {
  const frameSize = 16;
  const SPONGE_CHUNK_SIZE = 31;
  const inputs = new Array(frameSize).fill(BigInt(0));

  let i = 0;
  for (i; i < parseInt(`${bytes.length / SPONGE_CHUNK_SIZE}`); i++) {
    inputs[i] = ffUtils.beBuff2int(bytes.slice(SPONGE_CHUNK_SIZE * i, SPONGE_CHUNK_SIZE * (i + 1)));
  }

  if (bytes.length % SPONGE_CHUNK_SIZE != 0) {
    const buff = new Uint8Array(SPONGE_CHUNK_SIZE);
    const slice = bytes.slice(parseInt(`${bytes.length / SPONGE_CHUNK_SIZE}`) * SPONGE_CHUNK_SIZE);
    slice.forEach((v, idx) => {
      buff[idx] = v;
    });
    inputs[i] = ffUtils.beBuff2int(buff);
  }

  return inputs;
}

export function padArrayWithZeros(bigIntArray: bigint[], requiredLength: number) {
  const currentLength = bigIntArray.length;
  const zerosToFill = requiredLength - currentLength;

  if (zerosToFill > 0) {
    return [...bigIntArray, ...Array(zerosToFill).fill(BigInt(0))];
  }

  return bigIntArray;
}

export function bigIntChunksToByteArray(bigIntChunks: bigint[], bytesPerChunk = 31) {
  const bytes: number[] = [];

  // Remove last chunks that are 0n
  const cleanChunks = bigIntChunks
    .reverse()
    .reduce((acc: bigint[], item) => (acc.length || item !== 0n ? [...acc, item] : []), [])
    .reverse();

  cleanChunks.forEach((bigInt, i) => {
    let byteCount = 0;

    while (bigInt > 0n) {
      bytes.unshift(Number(bigInt & 0xffn));
      bigInt >>= 8n;
      byteCount++;
    }

    // Except for the last chunk, each chunk should be of size bytesPerChunk
    // This will add 0s that were removed during the conversion because they are LSB
    if (i < cleanChunks.length - 1) {
      if (byteCount < bytesPerChunk) {
        for (let j = 0; j < bytesPerChunk - byteCount; j++) {
          bytes.unshift(0);
        }
      }
    }
  });

  return bytes.reverse(); // reverse to convert big endian to little endian
}

export function bigIntsToString(bigIntChunks: bigint[]) {
  return bigIntChunksToByteArray(bigIntChunks)
    .map((byte) => String.fromCharCode(byte))
    .join('');
}
