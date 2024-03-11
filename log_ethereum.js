import Web3 from 'web3';
import { ethers } from 'ethers';
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

const subscription = (await web3.eth.subscribe('newBlockHeaders'));

subscription.on('data', async (blockHeader) => {
	try {
		const storageKeys = web3.eth.getStorageAt(targetWalletAddress, 0, blockHeader.number, (error, result) => {
			if (error) {
				console.error('Error getting storage: ', error);
			} else {
				console.log('Storage at 0: ', result);
			}
		});
		//web3.eth.getProof(address, storageKeysArray, blockNumber, [callback])
		const proof = await web3.eth.getProof(targetWalletAddress, storageKeys, blockHeader.number, ()=>{
			console.log('Proof received');
		});
		const isTargetWalletIncluded = web3.eth.verifyProof(proof);
		if (isTargetWalletIncluded) {
			console.log('Success: Target wallet address is included in the block header');
		} else {
			console.log('Target wallet address is not included in the block header');
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