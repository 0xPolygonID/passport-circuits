export const fullHashAlgs = [
  { shaAlg: 'sha1', shaLength: 160, description: 'SHA1' },
  { shaAlg: 'sha224', shaLength: 224, description: 'SHA224' },
  { shaAlg: 'sha256', shaLength: 256, description: 'SHA256' },
  { shaAlg: 'sha384', shaLength: 384, description: 'SHA384' },
  { shaAlg: 'sha512', shaLength: 512, description: 'SHA512' },
];

export const hashAlgs = [fullHashAlgs[2]]; // use sha256 as default
