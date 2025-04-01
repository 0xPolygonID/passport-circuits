import dotenv from 'dotenv';
import { describe } from 'mocha';
import { assert } from 'chai';
import { newMemEmptyTrie } from 'circomlibjs';
import { genMockPassportData } from '../../utils/passports/genMockPassportData';
import { formatMrz } from '../../utils/passports/format';
import { hashAlgs, fullHashAlgs } from './test_cases';
import { wasm as wasm_tester } from 'circom_tester';
import { generateLinkId } from '../../utils/passports/passport';

dotenv.config();

const path = require('path');
const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullHashAlgs : hashAlgs;

// Define a type for the circuit
interface Circuit {
  calculateWitness: (inputs: any, witness?: boolean) => Promise<bigint[]>;
  checkConstraints: (witness: bigint[]) => Promise<void>;
  release: () => void;
}


async function prepareTestData(mrz: string, lastNameSize: number, firstNameSize: number) {
  const mrzByteArray = formatMrz(mrz);
  if (mrzByteArray.length !== 93) {
    throw new Error('MRZ should be 93 bytes long');
  }

  const treeLevels = 13;
  const tree = await newMemEmptyTrie();
  // key-value pairs to build the credential template
  const template = [
    '12891444986491254085560597052395677934694594587847693550621945641098238258096', '1173248646377539879946536107369421994820880702773342056419798525241229208349', // credentialStatus.type
    '4809579517396073186705705159186899409599314609122482090560534255195823961763', '3930329666255035859341917616531724337843722428795107776052883525249467734017', // credentialSubject.type
    '1876843462791870928827702802899567513539510253808198232854545117818238902280', '6863952743872184967730390635778205663409140607467436963978966043239919204962', // credentialSchema.type
    '14122086068848155444790679436566779517121339700977110548919573157521629996400', '8932896889521641034417268999369968324098807262074941120983759052810017489370', // type.id
    '18943208076435454904128050626016920086499867123501959273334294100443438004188', '3930329666255035859341917616531724337843722428795107776052883525249467734017', // type.id
    '2282658739689398501857830040602888548545380116161185117921371325237897538551', '6785128192015566537155412245008504798482626052796872471438218406454907503679', // credentialSchema.id
    '4817156672888655522763064392525239094511187154831557262772815264540847425378', '0', // credentialSubject.dateOfBirth
    '2661316897620170050641842010022238582485958559445913964628121513401804945508', '0', // credentialSubject.documentExpirationDate
    '17812501853592608022106438142029031484125620705472224666715824544873239913147', '0', // credentialSubject.firstName
    '643493878926457766162531104335565260785288743937125657511062755781004518297', '0', // credentialSubject.fullName
    '5768075745493428917651844471684022554030750947591103713762344570867180513614', '0', // credentialSubject.governmentIdentifier
    '12037662945351652395520680282306597407040165994104304811455681806232413956620', '0', // credentialSubject.governmentIdentifierType
    '16829829523990922339853122033176330960757159233571217495904710638791793740933', '0', // credentialSubject.sex
    '18652354674254268839450839640508993614932212252620036777561285260846450401086', '0', // credentialStatus.revocationNonce
    '11896622783611378286548274235251973588039499084629981048616800443645803129554', '0', // credentialStatus.id
    '4792130079462681165428511201253235850015648352883240577315026477780493110675', '0', // credentialSubject.id
    '13483382060079230067188057675928039600565406666878111320562435194759310415773', '0', // expirationDate.id
    '8713837106709436881047310678745516714551061952618778897121563913918335939585', '0', // issuanceDate.id
    '5940025296598751562822259677636111513267244048295724788691376971035167813215', '0', // issuer.id
    '12721581730399791084220775389224758160887300573168177512619749567794685336757', '0', // credentialSubject.nationalities
    '8420111610095993874869544651671831438228943062702729758375308097770323355054', '0', // credentialSubject.nationalities
    '5174935119518540357656305431208837480424139947723235187406958318762813271623', '0', // credentialSubject.customFields.string3
  ];
  for (let i = 0; i < template.length; i += 2) {
    const key = tree.F.e(template[i]);
    const value = tree.F.e(template[i + 1]);
    await tree.insert(key, value);
  }
  const templateRoot = tree.F.toObject(tree.root);

  const updateTemplate = [
    '4817156672888655522763064392525239094511187154831557262772815264540847425378', '19960309', // credentialSubject.dateOfBirth
    '2661316897620170050641842010022238582485958559445913964628121513401804945508', '20350803', // credentialSubject.documentExpirationDate
    '17812501853592608022106438142029031484125620705472224666715824544873239913147', '779590574833975594150553032190316165100034337907701477766077549696170325957', // credentialSubject.firstName
    '643493878926457766162531104335565260785288743937125657511062755781004518297', '16124395655319932562687594154333620461512120815155591900166934828565073655159', // credentialSubject.fullName
    '5768075745493428917651844471684022554030750947591103713762344570867180513614', '3286800018689036072036595048281161368331306321215602580795106602635276597696', // credentialSubject.governmentIdentifier
    '12037662945351652395520680282306597407040165994104304811455681806232413956620', '12343105779965610540047025345938704312955329035594806470260411576419571786879', // credentialSubject.governmentIdentifierType
    '16829829523990922339853122033176330960757159233571217495904710638791793740933', '4366613503740245542741816499068547859478657796760861141829344679607332353738', // credentialSubject.sex
    '18652354674254268839450839640508993614932212252620036777561285260846450401086', '0', // credentialStatus.revocationNonce
    '11896622783611378286548274235251973588039499084629981048616800443645803129554', '19110037108107876991711039133061160427992750920441382464574409120359328284962', // credentialStatus.id
    '4792130079462681165428511201253235850015648352883240577315026477780493110675', '18026946060490633582346941999242407265442400633018823452652749104672360129751', // credentialSubject.id
    '13483382060079230067188057675928039600565406666878111320562435194759310415773', '1774114132000000000', // expirationDate.id
    '8713837106709436881047310678745516714551061952618778897121563913918335939585', '1742578132000000000', // issuanceDate.id
    '5940025296598751562822259677636111513267244048295724788691376971035167813215', '12146166192964646439780403715116050536535442384123009131510511003232108502337', // issuer.id
    '12721581730399791084220775389224758160887300573168177512619749567794685336757', '14193146200435563417722817655626671239476419932450502386457224894805250323461', // credentialSubject.nationalities
    '8420111610095993874869544651671831438228943062702729758375308097770323355054', '14193146200435563417722817655626671239476419932450502386457224894805250323461', // credentialSubject.nationalities
    '5174935119518540357656305431208837480424139947723235187406958318762813271623', '9966332195319259765266445177016037537993267892018038146457505167974530030333', // credentialSubject.customFields.string3
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
    dg2Hash: [... new TextEncoder().encode('88328f6e5066315192a573911a6f33081da50fd51397af13edb3d7badbb59f98')],
    lastNameSize: lastNameSize,
    firstNameSize: firstNameSize,
    currentDate: 250401,

    revocationNonce: 0,
    credentialStatusID:
      '19110037108107876991711039133061160427992750920441382464574409120359328284962',
    credentialSubjectID:
      '18026946060490633582346941999242407265442400633018823452652749104672360129751',
    userID: '23747161200420134456844951198264139815921171975208487354806063665905574145',
    issuer: '12146166192964646439780403715116050536535442384123009131510511003232108502337',
    issuanceDate: "1742578132",

    linkNonce: 1,
    templateRoot: templateRoot.toString(),
    siblings: siblings.map(arr => arr.map((x: BigInt) => x.toString())),
  };
}

testSuite.forEach(({ shaAlg, shaLength }) => {
  describe(`credential_${shaAlg}.circom`, function () {
    this.timeout(0);

    assert(process.env.FULL_TEST_SUITE === 'false', 'FULL_TEST_SUITE not supposed for all shaAlgs');

    let circuit;
    before(async () => {
      circuit = await wasm_tester(
        path.join(__dirname, `../../circuits/credential/instances/credential_${shaAlg}.circom`),
        {
          include: ['node_modules'],
        }
      );
    });
    after(async () => {
      circuit.release();
    });

    it(`Passport is valid and hashAlg is ${shaAlg}`, async function () {
      const lastName = 'KUZNETSOV';
      const firstName = 'VALERIY';
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
      const inputs = await prepareTestData(passportData.mrz, lastName.length, firstName.length);

      const w = await circuit.calculateWitness(inputs, true);
      await circuit.checkConstraints(w);
      // Document code hash (output 1)
      assert(
        w[1] === 12343105779965610540047025345938704312955329035594806470260411576419571786879n
      );

      // Issuing State or organization hash (output 2)
      assert(
        w[2] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n
      );

      // Last name hash (output 3)
      assert(
        w[3] === 16124395655319932562687594154333620461512120815155591900166934828565073655159n
      );

      // First name hash (output 4)
      assert(w[4] === 779590574833975594150553032190316165100034337907701477766077549696170325957n);

      // Document number hash (output 5)
      assert(
        w[5] === 3286800018689036072036595048281161368331306321215602580795106602635276597696n
      );

      // Nationality hash (output 6)
      assert(
        w[6] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n
      );

      // Date of Birth hash (output 7)
      assert(w[7] === 19960309n);

      // Sex hash (output 8)
      assert(
        w[8] === 4366613503740245542741816499068547859478657796760861141829344679607332353738n
      );

      // Date of expiry hash (output 9)
      assert(w[9] === 20350803n);

      console.log('\x1b[35m%s\x1b[0m', 'Hash Index:', w[10]);
      console.log('\x1b[34m%s\x1b[0m', 'Hash Value:', w[11]);
      // Hash Index
      assert(
        w[10] === 18453705905784539948506207037969849512599789901901025934328593654364072030693n,
        `Hash Index: ${w[10]}`
      );

      // Hash Value
      assert(
        w[11] === 20008859012517445819901041236908823100073815023181291226591238728478957482360n,
        `Hash Value: ${w[11]}`
      );

      const linkId_js = generateLinkId(passportData, inputs.linkNonce.toString()); 
      console.log('\x1b[35m%s\x1b[0m', 'js: linkId:', linkId_js);
      const linkId = (await circuit.getOutput(w, ['linkId'])).linkId;
      console.log('\x1b[34m%s\x1b[0m', 'circom linkId', linkId);
      assert(linkId === linkId_js);
      
      // Compare template root
      assert(w[15] === 11355012832755671330307538002239263753806804904003813746452342893352381210514n);
    });
    /*
  it(`Double last name`, async function() {
    const {mrz, surnameSize, givenNamesSize} = generateMRZ(
      "P",
      "UKR",
      "KUZNETSOV",
      "VALERIY",
      "AC1234567",
      "UKR",
      "960309",
      "M",
      "350803",
    );
    const inputs = await prepareTestData(docs, 11, 8);
    const w = await circuit.calculateWitness(inputs, true);
    await circuit.checkConstraints(w);
    // Document code hash (output 1)
    assert(w[1] === 12343105779965610540047025345938704312955329035594806470260411576419571786879n);

    // Issuing State or organization hash (output 2)
    assert(w[2] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n);

    // Last name hash (output 3)
    assert(w[3] === 16684418381729930583844995012712504418990732401801825107387099797112025696324n);

    // First name hash (output 4)
    assert(w[4] === 7882444430312531813986531690355256034187461560449276183886474511877560234822n);

    // Document number hash (output 5)
    assert(w[5] === 13365184592845315309100297120259965838903705444844448460767566282483182375642n);

    // Nationality hash (output 6)
    assert(w[6] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n);

    // Date of Birth hash (output 7)
    assert(w[7] === 19980309n);

    // Sex hash (output 8)
    assert(w[8] === 4366613503740245542741816499068547859478657796760861141829344679607332353738n);

    // Date of expiry hash (output 9)
    assert(w[9] === 20310803n);
  });
  */
  });
});

describe('credential_sha256.circom', function () {
  this.timeout(0);
  let circuit: Circuit;
  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/credential/instances/credential_sha256.circom'),
      {
        include: ['node_modules'],
      }
    );
  });
  after(async () => {
    circuit.release();
  });

  it(`Passport is expired`, async function () {
    const lastName = 'KUZNETSOV';
    const firstName = 'VALERIY';
    const passportData = genMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha1_65537_2048',
      'UKR',
      '960309',
      '240803',
      'AC1234567',
      'KUZNETSOV',
      'VALERIY'
    );
    const inputs = await prepareTestData(passportData.mrz, lastName.length, firstName.length);
    try {
      await circuit.calculateWitness(inputs, true);
      assert.fail('Expected an Assertion Error but no error was thrown');
    } catch (error: unknown) {
      if (error instanceof Error) {
        assert(
          error.message.includes('Assert Failed'),
          `Expected Assertion Error but got: ${error.message}`
        );
      } else {
        assert.fail('Expected an Error object but got a different type');
      }
    }
  });
});
