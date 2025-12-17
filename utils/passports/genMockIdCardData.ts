import { PassportData } from '../types';
import { countryCodes } from '../constants/constants';
import { SignatureAlgorithm } from '../types';
import { buildTD1, buildFullICAODocumentPayload } from './utils';
import { formatMrzTD1 } from './format';

export function genMockIdCardData(
  dgHashAlgo: string,
  eContentHashAlgo: string,
  signatureType: SignatureAlgorithm,
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  documentNumber: string = 'ID1234567',
  lastName: string = 'DUPONT',
  firstName: string = 'ALPHONSE'
): PassportData {
  const mrz = buildTD1(
    nationality,
    birthDate,
    expiryDate,
    'M',
    documentNumber,
    lastName,
    firstName
  );
  const mrzByteArray = formatMrzTD1(mrz);

  return buildFullICAODocumentPayload(
    dgHashAlgo,
    signatureType,
    mrz,
    mrzByteArray,
    eContentHashAlgo
  );
}
