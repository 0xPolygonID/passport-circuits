```mermaid
sequenceDiagram
    participant P as Passport
    participant M as Mobile
    participant DCS as DCS.circuit
    participant R as Register.circuit
    participant VC as VC_and_disclose.circuit
    participant HUB as IdentityVerificationHub SC
    participant IR as IdentityRegistry SC
    participant A as Airdrop SC
    M ->> P: Scan passport data NFC
    M ->> M: Parse passport data (DG1, SOD, ..)
    M ->> IR: isRegisteredDscKeyCommitment()
    opt If isRegisteredDscKeyCommitment returns false
        M ->> DCS: Generate DCS proof
        DCS ->> DCS: Generate proof
        DCS ->> M: return proof
        M ->> HUB:registerDscKeyCommitment(proof)
        HUB ->> HUB: verify proof
        HUB ->> IR: registerDscKeyCommitment(DSC_TREE_LEAF)
    end
    M ->> R: Generate Register proof
    R ->> R: Generate proof
    R ->> M: Return proof
    M ->> HUB: registerPassportCommitment(proof)
    HUB ->> HUB: Verify proof, checkDscKeyCommitmentMerkleRoot
    HUB ->> IR: registerCommitment(nullifier, registerCommitment)
    M ->> M: Passport registration succeed
    M ->> VC: Generate disclose proof
    VC ->> VC: Generate proof
    VC ->> M: Return proof
    M ->> A: verifySelfProof(proof)
    A ->> HUB: verifyVcAndDisclose(proof)
    HUB ->> IR: verify passport registration
    HUB ->> HUB: verify disclose proof
    HUB ->> A: proof valid
    A ->> A: emit UserIdentifierRegistered
   

```