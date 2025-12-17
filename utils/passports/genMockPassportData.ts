import { PassportData } from '../types';
import { countryCodes } from '../constants/constants';
import { SignatureAlgorithm } from '../types';
import { formatMrzTD3 } from './format';
import { buildTD3, buildFullICAODocumentPayload } from './utils';

export function genMockPassportData(
  dgHashAlgo: string,
  eContentHashAlgo: string,
  signatureType: SignatureAlgorithm,
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  passportNumber: string = '15AA81234',
  lastName: string = 'DUPONT',
  firstName: string = 'ALPHONSE HUGHUES ALBERT'
): PassportData {
  const mrz = buildTD3(nationality, birthDate, expiryDate, passportNumber, lastName, firstName);
  const mrzByteArray = formatMrzTD3(mrz);

  return buildFullICAODocumentPayload(
    dgHashAlgo,
    signatureType,
    mrz,
    mrzByteArray,
    eContentHashAlgo
  );
}
