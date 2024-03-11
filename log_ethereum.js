import Web3 from 'web3';
import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';
import dotenv from 'dotenv';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetWalletAddress = process.argv[2];
const withholding_wallet = process.argv[3];

console.log('Starting process for wallet: ', targetWalletAddress);
console.log('Withholding wallet: ', withholding_wallet);

console.log( 'Type of target wallet address: ', typeof targetWalletAddress);
console.log( 'Type of withholding wallet address: ', typeof withholding_wallet);

const subscription = await (web3.eth.subscribe('newBlockHeaders'));

subscription.on('data', async (blockHeader) => {
	try {


		//get the last transaction hash of the targetWalletAddress
		const lastTxHash = await web3.eth.getStorageAt(targetWalletAddress, 0);
		console.log('Last transaction hash: ', lastTxHash);
		

		if (tree.getHexRoot()) {
			const proof = tree.getHexProof(lastTxHash); // Get Merkle proof for the target wallet address

			if (tree.verify(proof, targetWalletAddress, tree.getRoot())) { // Verify proof
				console.log('Transaction involving target wallet detected in block: ', blockHeader.number);
				// Process the transaction or take necessary action
			} else {
				console.error('Invalid Merkle proof for target wallet address in block: ', blockHeader.number);
			}
		} else {
			console.log('Target wallet address not involved in transactions in block: ', blockHeader.number);
		}
	} catch (error) {
		if (error.code === 430 || error.code === 101 || error.code === 506) return;
		console.error('Error on transaction detection: ', error);
	}
});


subscription.on('error', (error) => {
	console.error('Error on subscription: ', error);
});

process.on('exit', () => {
	subscription.unsubscribe((error, success) => {
		if (success) {
			console.log('Successfully unsubscribed!');
		}
	});
});




// block.transactions.forEach((tx) => {
// 	if (tx.to === targetWalletAddress || tx.from === targetWalletAddress) {
// 		console.log('Transaction detected: ', tx);
// 		const withholdingAmt = ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10));
// 		const withholdingTransaction = {
// 			user_withholding_wallet: withholding_wallet,
// 			amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
// 			hash: tx.hash,
// 			chain: 'Ethereum'
// 		};
// 		try {
// 			process.send(withholdingTransaction);
// 		} catch (error) {
// 			console.error('Error sending transaction data: ', error);
// 		}
// 	}
// });