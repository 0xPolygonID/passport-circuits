# ZK Passport
## Project Structure
- `circuits`: circuits to create passport and Aadhaar credentials.
- `contracts/verifiers`: groth16 verifier contracts built from the circuits.
- `package`: files needed for generation of witness calculator from `witnesscalc-template` project.
- `scripts`: scripts for building and packaging
- `tests`: tests for the different circuits.

## Installation and compilation
1. Install dependencies
  ```shell
  git submodule update --init --recursive
  ```
  ```shell
  yarn install
  ```
2. Build circuits for the different instances of signature algorithms based on scripts in `scripts/build/`. 
  ```shell
  npm run build-dsc
  ```
  ```shell
  npm run build-signature
  ```
  Results for the builds in `build` folder.
  
  You can select which circuits to build by updating `:true` of `:false` in the scripts for circuits in the `CIRCUITS` variable.

3. Generate package for the different instances of signature algorithms based on scripts in `scripts/package/`.
  ```shell
  npm run package-dsc
  ```
  ```shell
  npm run package-signature
  ```
  Results for the packages in `package` folder.
  
  You can select which circuits to package by updating `:true` of `:false` in the scripts for circuits in the `CIRCUITS` variable.

## Test
You can change `sigAlgs` in `test_cases.ts` to run specific signature algorithm.
```
npm run test-dsc
```
```
npm run test-signature
```

## Integration tests
Once the circuits are built and packaged you can test integrations generating witnesses, proofs and verifying the proofs for desired circuit or full test suite.

First of all you need to download `prover` executable from `rapidsnark` for your OS from https://github.com/iden3/rapidsnark/releases and copy it to `rapidsnark` folder.

Now you are ready to execute integration tests.

- Single circuit specified in `test_cases.ts` in `sigAlgs`
```
npm run integration-dsc
```
or 
```
npm run integration-signature
```
- Full suite specified in `test_cases.ts` in `fullSigAlgs`
```
FULL_TEST_SUITE=true npm run integration-dsc
```
or
```
FULL_TEST_SUITE=true npm run integration-signature
```
