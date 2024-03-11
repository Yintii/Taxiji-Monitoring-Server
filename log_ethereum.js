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
		const block = await web3.eth.getBlock(blockHeader.number, true);
		
		//use a merkle proof to check if the target wallet address is in the block
		//if it is, console.log the block number and the transaction hash
		const merkleProof = await web3.eth.getBlock(blockHeader.number, true);
		if(merkleProof.transactionsRoot === targetWalletAddress){
			console.log('Transaction detected: ', block.transactions);
			//then find the transaction and the amount of the transaction from the hash
			const transaction = await web3.eth.getTransaction(block.transactions);
			const withholdingAmt = ethers.formatEther(BigInt(transaction.value) * BigInt(2) / BigInt(10));
			const withholdingTransaction = {
				user_withholding_wallet: withholding_wallet,
				amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
				hash: transaction.hash,
				chain: 'Ethereum'
			};

			try {
				process.send(withholdingTransaction);
			}
			catch (error) {
				console.error('Error sending transaction data: ', error);
			}	
		}else{
			return;
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