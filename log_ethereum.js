import Web3 from 'web3';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { MerkleTree } from 'merkletreejs';
import keccak from 'keccak';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetWalletAddress = process.argv[2];
const withholding_wallet = process.argv[3];

console.log('Starting process for wallet: ', targetWalletAddress);
console.log('Withholding wallet: ', withholding_wallet);

console.log('Type of target wallet address: ', typeof targetWalletAddress);
console.log('Type of withholding wallet address: ', typeof withholding_wallet);

async function checkBlock(blockHeader) {
	try {
		const block = await web3.eth.getBlock(blockHeader.number, true);

		// Use a Merkle tree to check if the target wallet address is in the block
		const leaves = block.transactions.map(tx => tx.to); // Assuming we want to check the "to" address
		const tree = new MerkleTree(leaves, keccak);
		const rootHash = tree.getRoot().toString('hex');

		if (rootHash === targetWalletAddress)
			console.log('Transaction detected in block:', blockHeader.number);
		

		// Then find the transaction and the amount of the transaction from the hash
		let transaction = block.transactions.filter(async tx => tx.to === targetWalletAddress || tx.from === targetWalletAddress);

		console.log('Transaction detected: ', transaction);
		const withholdingAmt = ethers.formatEther(BigInt(transaction.value) * BigInt(2) / BigInt(10));
		const withholdingTransaction = {
			user_withholding_wallet: withholding_wallet,
			amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
			hash: transaction.hash,
			chain: 'Ethereum'
		};
		try {
			process.send(withholdingTransaction);
		} catch (error) {
			console.error('Error sending transaction data: ', error);
		}
		
	} catch (error) {
		console.error('Error on transaction detection: ', error);
	}
}

web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
	if (error) {
		console.error('Error on subscription: ', error);
		return;
	}

	checkBlock(blockHeader);
});

process.on('exit', () => {
	console.log('Exiting...');
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