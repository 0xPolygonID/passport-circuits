import dotenv from 'dotenv';
import { expect } from 'chai';
import fs from 'fs';
import { genMockPassportData } from '../../../utils/passports/genMockPassportData';
import { getCircuitNameFromPassportData } from '../../../utils/circuits/circuitsName';
import * as snarkjs from 'snarkjs';
import { exec } from 'child_process';
import { fullHashAlgs, hashAlgs } from './test_cases';
import { formatMrz } from '../../../utils/passports/format';
import { newMemEmptyTrie } from 'circomlibjs';
dotenv.config();

const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullHashAlgs : hashAlgs;

const execute = async (command: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (!!stdout) {
        console.log(stdout);
      }

      if (!!stderr) {
        console.error(stderr);
      }

      if (!!error) {
        reject(error.message);
        return;
      }

      resolve(stdout);
    });
  });
};

async function prepareTestData(mrz: string, lastNameSize: number, firstNameSize: number) {
  const mrzByteArray = formatMrz(mrz);
  if (mrzByteArray.length !== 93) {
    throw new Error('MRZ should be 93 bytes long');
  }

  const treeLevels = 10;
  const tree = await newMemEmptyTrie();
  // key-value pairs to build the credential template
  const template = [
    '4809579517396073186705705159186899409599314609122482090560534255195823961763',
    '15740774959206304300569618599869272754286189696397051571631518488419809088501', // credentialSubject.type
    '12891444986491254085560597052395677934694594587847693550621945641098238258096',
    '870222225577550446142292957325790690140780476504858538425256779240825462837', // credentialStatus.type
    '1876843462791870928827702802899567513539510253808198232854545117818238902280',
    '6863952743872184967730390635778205663409140607467436963978966043239919204962', // credentialSchema.type
    '14122086068848155444790679436566779517121339700977110548919573157521629996400',
    '8932896889521641034417268999369968324098807262074941120983759052810017489370', // type.id
    '18943208076435454904128050626016920086499867123501959273334294100443438004188',
    '15740774959206304300569618599869272754286189696397051571631518488419809088501', // type.id
    '2282658739689398501857830040602888548545380116161185117921371325237897538551',
    '6871229518191218656058751484443257943894148319679406049416377341576591110412', // credentialSchema.id
    '11718818292802126417463134214212976082628052906423225153106612749610200183413',
    0, // credentialSubject.dateOfBirth
    '17067102995727523284306589033691644246394899863627321097385336370172459010471',
    0, // credentialSubject.documentExpirationDate
    '396948171793807448670779079530437970230319997763427297159364741404168161086',
    0, // credentialSubject.firstName
    '1540185022550171417964535586735569210235830901649938832989137234790618138161',
    0, // credentialSubject.fullName
    '11665818515976908772146086926627988937767272157525043131077389782866401822622',
    0, // credentialSubject.govermentIdentifier
    '20378936560477526294120993552723258097975107008215368308010022877877877266947',
    0, // credentialSubject.governmentIdentifierType
    '10966443938224095219566683003147654763133050970169721700346734909387575337367',
    0, // credentialSubject.sex
    '1763085948543522232029667616550496120517967703023484347613954302553484294902',
    0, // credentialStatus.revocationNonce
    '11896622783611378286548274235251973588039499084629981048616800443645803129554',
    0, // credentialStatus.id
    '4792130079462681165428511201253235850015648352883240577315026477780493110675',
    0, // credentialSubject.id
    '13483382060079230067188057675928039600565406666878111320562435194759310415773',
    0, // expirationDate.id
    '8713837106709436881047310678745516714551061952618778897121563913918335939585',
    0, // issuanceDate.id
    '5940025296598751562822259677636111513267244048295724788691376971035167813215',
    0, // issuer.id
    '9656117739891539357123771284552289598577388060024608839018723118201732735699',
    0, // credentialSubject.nationalities
    '15699466668150257351625206938060640380549592812731019574696943258403707765146',
    0, // credentialSubject.nationalities
  ];
  for (let i = 0; i < template.length; i += 2) {
    const key = tree.F.e(template[i]);
    const value = tree.F.e(template[i + 1]);
    await tree.insert(key, value);
  }
  const templateRoot = tree.F.toObject(tree.root);

  const updateTemplate = [
    '11718818292802126417463134214212976082628052906423225153106612749610200183413',
    '19960309', // credentialSubject.dateOfBirth
    '17067102995727523284306589033691644246394899863627321097385336370172459010471',
    '20350803', // credentialSubject.documentExpirationDate
    '396948171793807448670779079530437970230319997763427297159364741404168161086',
    '779590574833975594150553032190316165100034337907701477766077549696170325957', // credentialSubject.firstName
    '1540185022550171417964535586735569210235830901649938832989137234790618138161',
    '16124395655319932562687594154333620461512120815155591900166934828565073655159', // credentialSubject.fullName
    '11665818515976908772146086926627988937767272157525043131077389782866401822622',
    '3286800018689036072036595048281161368331306321215602580795106602635276597696', // credentialSubject.govermentIdentifier
    '20378936560477526294120993552723258097975107008215368308010022877877877266947',
    '12343105779965610540047025345938704312955329035594806470260411576419571786879', // credentialSubject.governmentIdentifierType
    '10966443938224095219566683003147654763133050970169721700346734909387575337367',
    '4366613503740245542741816499068547859478657796760861141829344679607332353738', // credentialSubject.sex
    '1763085948543522232029667616550496120517967703023484347613954302553484294902',
    '0', // credentialStatus.revocationNonce
    '11896622783611378286548274235251973588039499084629981048616800443645803129554',
    '16603911885187767870919822407799731636565604584676607750769528349133273200010', // credentialStatus.id
    '4792130079462681165428511201253235850015648352883240577315026477780493110675',
    '3745441007954160411654262789843002077789321640339311933900305373126451426785', // credentialSubject.id
    '13483382060079230067188057675928039600565406666878111320562435194759310415773',
    '2069712000000000000', // expirationDate.id
    '8713837106709436881047310678745516714551061952618778897121563913918335939585',
    '1742226596000000000', // issuanceDate.id
    '5940025296598751562822259677636111513267244048295724788691376971035167813215',
    '17295047724547381467021463956538704517040397694116563840254657915956112809540', // issuer.id
    '9656117739891539357123771284552289598577388060024608839018723118201732735699',
    '14193146200435563417722817655626671239476419932450502386457224894805250323461', // credentialSubject.nationalities
    '15699466668150257351625206938060640380549592812731019574696943258403707765146',
    '14193146200435563417722817655626671239476419932450502386457224894805250323461', // credentialSubject.nationalities
  ];
  const siblings = [[]];
  for (let i = 0; i < updateTemplate.length; i += 2) {
    const key = tree.F.e(updateTemplate[i]);
    const value = tree.F.e(updateTemplate[i + 1]);
    const res = await tree.update(key, value);
    for (let i = 0; i < res.siblings.length; i++)
      res.siblings[i] = tree.F.toObject(res.siblings[i]);
    while (res.siblings.length < treeLevels) res.siblings.push(0);
    siblings.push(res.siblings);
  }

  return {
    dg1: [...mrzByteArray],
    lastNameSize: lastNameSize,
    firstNameSize: firstNameSize,
    currentDate: 250401,

    revocationNonce: 0,
    credentialStatusID:
      '16603911885187767870919822407799731636565604584676607750769528349133273200010',
    credentialSubjectID:
      '3745441007954160411654262789843002077789321640339311933900305373126451426785',
    userID: '23747161200420134456844951198264139815921171975208487354806063665905574145',
    issuer: '17295047724547381467021463956538704517040397694116563840254657915956112809540',
    issuanceDate: 1742226596,

    linkNonce: 1,
    templateRoot: templateRoot.toString(),
    siblings: siblings.map((s) => s.map((x) => x.toString())),
  };
}

testSuite.forEach(
  ({ shaAlg }) => {
    
    const passportData = genMockPassportData(
      shaAlg,
      shaAlg,
      'rsa_sha1_65537_2048', // not important for this test
      'UKR',
      '960309',
      '350803',
      'AC1234567',
      'KUZNETSOV',
      'VALERIY'
    );
    describe(`Credential - ${shaAlg.toUpperCase()}`, () => {
      let witness_calculator;
      let circuitName;
      let circuit_graph_path;
      let input_path;
      let witnes_path;
      let zkey_path;
      let v_key;
      const lastName = 'KUZNETSOV';
      const firstName = 'VALERIY';
      let inputs;

      before(async () => {
        inputs = await prepareTestData(passportData.mrz, lastName.length, firstName.length);
        circuitName = `credential_${shaAlg}`;
        witness_calculator = `./circom-witnesscalc/target/release/calc-witness`;
        circuit_graph_path = `./build/credential/${circuitName}/${circuitName}_graph.wcd`;
        input_path = `./build/credential/${circuitName}/input.json`;
        witnes_path = `./build/credential/${circuitName}/output.wtns`;
        zkey_path = `./build/credential/${circuitName}/${circuitName}_final.zkey`;
        v_key = `./build/credential/${circuitName}/${circuitName}_vkey.json`;
      });

      it('should find the witness calculator', async function () {
        expect(fs.existsSync(witness_calculator)).to.be.true;
      });

      it('should compute a valid witness, generate proof and verify it', async () => {
        // 1. Generate input.json
        fs.writeFileSync(
          input_path,
          JSON.stringify(inputs, null, 2)
        );

        // 2. Generate witness
        try {
          await execute(
            `time ${witness_calculator} "${circuit_graph_path}" "${input_path}" "${witnes_path}"`
          );
        } catch (error) {
          console.log('error!!!', error);
          // if the promise rejects, we land here
        }
        console.log('zkey_path', zkey_path);
        console.log('witnes_path', witnes_path);
        // 3. Generate proof
        const { proof, publicSignals } = await snarkjs.groth16.prove(
          zkey_path,
          witnes_path
        );

        console.log('Public signals:', publicSignals);
        console.log('Proof:', proof);

        const vkey = JSON.parse(
          fs.readFileSync(v_key).toString()
        );

        // 4. Verify proof
        const verification = await snarkjs.groth16.verify(vkey, publicSignals, proof);
        expect(verification).to.be.true;
      });
    });
  }
);
