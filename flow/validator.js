import * as fcl from "@onflow/fcl"

const verify = async (message, hexPublicKey, hexSignature) => {
  const code = `
  pub fun main(message: String, hexPublicKey: String, hexSignature: String): Bool {
    let publicKey = PublicKey(
        publicKey: hexPublicKey.decodeHex(),
        signatureAlgorithm: SignatureAlgorithm.ECDSA_secp256k1
    )

    let isValid = publicKey.verify(
        signature: hexSignature.decodeHex(),
        signedData: message.utf8,
        domainSeparationTag: "",
        hashAlgorithm: HashAlgorithm.KECCAK_256
    )

    return isValid
}
  `

  const isValid = await fcl.query({
    cadence: code,
    args: (arg, t) => [
      arg(message, t.String),
      arg(hexPublicKey, t.String),
      arg(hexSignature, t.String)
    ]
  }) 

  return isValid ?? false
}

const validator = {
  verify
}

export default validator