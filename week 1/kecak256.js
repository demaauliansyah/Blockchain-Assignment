const ethers = require("ethers")

// The raw data whose integrity we have to verify. The first two bytes a
// are a user identifier, and the last two bytes the amount of tokens the
// user owns at present.
//
// Storing the data like this makes it easy for the Solidity code to
// understand it. This saves us a lot of processing compared to the naive
// solution of using JSON
const dataArray = [
    utils.keccak256([ 0x12, 0x34 ])
// '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432'

utils.keccak256("0x")
// '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

utils.keccak256("0x1234")
// '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432'

// The value MUST be data, such as:
//  - an Array of numbers
//  - a data hex string (e.g. "0x1234")
//  - a Uint8Array

// Do NOT use UTF-8 strings that are not a DataHexstring
utils.keccak256("hello world")
// [Error: invalid arrayify value] {
//   argument: 'value',
//   code: 'INVALID_ARGUMENT',
//   reason: 'invalid arrayify value',
//   value: 'hello world'
// }

// If needed, convert strings to bytes first:
utils.keccak256(utils.toUtf8Bytes("hello world"))
// '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad'

// Or equivalently use the identity function:
utils.id("hello world")
// '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad'

// Keep in mind that the string "0x1234" represents TWO
// bytes (i.e. [ 0x12, 0x34 ]. If you wish to compute the
// hash of the 6 characters "0x1234", convert it to UTF-8
// bytes first using utils.toUtf8Bytes.

// Consider the following examples:

// Hash of TWO (2) bytes:
utils.keccak256("0x1234")
// '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432'

// Hash of TWO (2) bytes: (same result)
utils.keccak256([ 0x12, 0x34 ])
// '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432'

bytes = utils.toUtf8Bytes("0x1ac7d1b81b7ba1025b36ccb86723da6ee5a87259f1c2fd5abe69d3200b512ec8")
// Uint8Array [ 48, 120, 49, 50, 51, 52 ]

// Hash of SIX (6) characters (different than above)
utils.keccak256(bytes)
// '0x1ac7d1b81b7ba1025b36ccb86723da6ee5a87259f1c2fd5abe69d3200b512ec8'

// Hash of SIX (6) characters (same result)
utils.id("0x1234")
// '0x1ac7d1b81b7ba1025b36ccb86723da6ee5a87259f1c2fd5abe69d3200b512ec8'
]

// The array of hash values, as BigInts 
//
// In this case it's just the data array.
// For more complicated data representation it might be necessary to
// hash the data before calculating Merkle values.
const hashArray = dataArray; 


// Symetrical hash of a pair so we won't care if the order is reversed.
// This code also converts between the string the hash function expects
// and the BigInt we rest of the code uses
const pairHash = (a,b) => BigInt(ethers.utils.keccak256('0x' + 
       (a^b).toString(16).padStart(64,0)))



// The value to denote that a certain branch is empty, doesn't
// have a value
const empty = 0n


// Calculate one level up the tree of a hash array by taking the hash of 
// each pair in sequence
const oneLevelUp = inputArray => {
    var result = []
    var inp = [...inputArray]    // To avoid over writing the input

    // Add an empty value if necessary (we need all the leaves to be
    // paired)
    if (inp.length % 2 === 1)
        inp.push(empty)

    for(var i=0; i<inp.length; i+=2)
        result.push(pairHash(inp[i],inp[i+1]))

    return result
}    // oneLevelUp


// Get the merkle root of a hashArray
const getMerkleRoot = inputArray => {
    var result

    result = [...inputArray]

    // Climb up the tree until there is only one value, that is the
    // root. 
    //
    // Note that if a layer has an odd number of entries the
    // code in oneLevelUp adds an empty value, so if we have, for example,
    // 10 leaves we'll have 5 branches in the second layer, 3
    // branches in the third, 2 in the fourth and the root is the fifth       
    while(result.length > 1)
        result = oneLevelUp(result)

    return result[0]
}

const merkleRoot = getMerkleRoot(hashArray)
console.log(`Merkle Root: ${merkleRoot}`)

// A merkle proof consists of the value of the list of entries to 
// hash with. Because we use a symmetrical hash function, we don't
// need the item's location to verify, only to create the proof.
const getMerkleProof = (inputArray, n) => {
    var result = [], currentLayer = [...inputArray], currentN = n

    // Until we reach the top
    while (currentLayer.length > 1) {
        // No odd length layers
        if (currentLayer.length % 2)
            currentLayer.push(empty)

        result.push(currentN % 2    
               // If currentN is odd, add the value before it
            ? currentLayer[currentN-1] 
               // If it is even, add the value after it
            : currentLayer[currentN+1])

        // Move to the next layer up
        currentN = Math.floor(currentN/2)
        currentLayer = oneLevelUp(currentLayer)
    }   // while currentLayer.length > 1

    return result
}   // getMerkleProof



// Verify a merkle proof that nValueHash is in the merkle tree, for 
// a given merkle root. This code needs to be run by the contract, so we'll 
// translate it to Solidity.
const verifyMerkleProof = (root, nValueHash, proof) => {
    var hashVal = nValueHash // The hash for this layer

    // For every tree layer
    for(layer=0; layer<proof.length; layer++)
        hashVal = pairHash(proof[layer],hashVal)

    return root === hashVal
}  // verifyMerkleProof




const itemProved = 5
const proof = getMerkleProof(hashArray, itemProved)
console.log(`Merkle proof for item ${itemProved}: ${proof}`)



console.log(`Should be true (good proof): ${
      verifyMerkleProof(merkleRoot, hashArray[itemProved], proof)}`)


console.log(`Should be false (bad proof): ${
      verifyMerkleProof(merkleRoot, hashArray[itemProved ^ 2], proof)}`)