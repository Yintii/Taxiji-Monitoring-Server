import Web3 from 'web3';
//import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetTransactionHash = process.argv[2];
const withholding_wallet = process.argv[3];

console.log('Starting process for transaction hash: ', targetTransactionHash);
console.log('Withholding wallet: ', withholding_wallet);

const subscription = web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
	if (error) {
		console.error('Error on subscription: ', error);
		return;
	}

	web3.eth.getBlock(blockHeader.hash, true, (error, block) => {
		if (error) {
			console.error('Error getting block: ', error);
			return;
		}

		const transaction = block.transactions.find(tx => tx.hash === targetTransactionHash);
		if (transaction) {
			const txIndex = block.transactions.indexOf(transaction);
			const proof = web3.eth.abi.encodeParameter('bytes32[]', block.transactions.map(tx => tx.hash));
			const path = web3.eth.abi.encodeParameter('uint256', txIndex);
			const root = block.transactionsRoot;

			// Verifying Merkle proof
			const verified = web3.eth.accounts.verifyProof(proof, path, root, transaction.hash);
			if (verified) {
				console.log('Transaction found in block:', block.number);
				// Perform actions with the found transaction
			} else {
				console.log('Transaction not found in block:', block.number);
			}
		}
	});
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

//old method

// import Web3 from 'web3';
// import { ethers } from 'ethers';
// import dotenv from 'dotenv';
// dotenv.config();

// const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
// const web3 = new Web3(sepoliaApiUrl);

// const targetWalletAddress = process.argv[2];
// const withholding_wallet = process.argv[3];

// console.log('Starting process for wallet: ', targetWalletAddress);
// console.log('Withholding wallet: ', withholding_wallet);

// console.log( 'Type of target wallet address: ', typeof targetWalletAddress);
// console.log( 'Type of withholding wallet address: ', typeof withholding_wallet);

// const subscription = (await web3.eth.subscribe('pendingTransactions'));

// subscription.on('data', async (txHash) => {
//     try {
//         const tx = await web3.eth.getTransaction(txHash);
//         // Check if tx is not undefined and has the value field
//         if (tx && tx.value) {
// 			// Check if the transaction is not to the contract
// 			let notToContract = tx.to !== process.env.SEPOLIA_CONTRACT_ADDRESS;

// 			if (notToContract && tx.from === targetWalletAddress || notToContract && tx.to === targetWalletAddress) {
// 				console.log('Transaction detected: ', txHash);
// 				const withholdingAmt = ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10));
// 				const withholdingTransaction = {
// 					user_withholding_wallet: withholding_wallet,
// 					amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
// 					hash: txHash,
// 					chain: 'Ethereum'
// 				};
// 				try {
// 					//pendingTransactions.push(withholdingTransaction);
// 					process.send(withholdingTransaction);
// 				}catch (error){
// 					console.error('Error sending transaction data: ', error);
// 				}
//             }
//         }
//     } catch (error) {
//         if (error.code === 430 || error.code === 101 || error.code === 506) return;
//         console.error('Error on transaction detection: ', error);
//     }
// });

// subscription.on('error', (error) => {
// 	console.error('Error on subscription: ', error);
// });

// process.on('exit', () => {
// 	subscription.unsubscribe((error, success) => {
// 		if (success) {
// 			console.log('Successfully unsubscribed!');
// 		}
// 	});
// });