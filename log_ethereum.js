import Web3 from 'web3';
import { ethers } from 'ethers';
import axios from 'axios';
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
		
		const block = await web3.eth.getBlock(blockHeader.number, true);

		const lastTransactionHash = await getLastTransactionHash(targetWalletAddress);

		console.log('Last transaction hash: ', lastTransactionHash);

		console.log("Block data: ", block);

		//perform a binary search to find the transaction
		//checking both tx.from and tx.to for the targetWalletAddress
		const binarySearch = (arr, target) => {
			let left = 0;
			let right = arr.length - 1;
			while (left <= right) {
				let mid = left + Math.floor((right - left) / 2);
				if (arr[mid].from === target || arr[mid].to === target) {
					return [arr[mid]];
				}
				if (arr[mid].from < target) {
					left = mid + 1;
				} else {
					right = mid - 1;
				}
			}
			return [];
		}

		const transaction = binarySearch(sortedTransactions, lastTransactionHash);

		console.log("Transaction present?: ", transaction);


		if (transaction.length === 0) return;
		console.log('Transaction detected: ', transaction);

		const value = parseInt(transaction[0].value);

		console.log('Value of transaction: ', value);

		const withholdingAmt = ethers.formatEther(BigInt(value) * BigInt(2) / BigInt(10));
		const withholdingTransaction = {
			user_withholding_wallet: withholding_wallet,
			amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
			hash: transaction[0].hash,
			chain: 'Ethereum'
		};
		try {
			process.send(withholdingTransaction);
		} catch (error) {
			console.error('Error sending transaction data: ', error);
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




async function getLastTransactionHash(walletAddress) {
	try {
		const response = await axios.get(`https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`);

		if (response.data.status === '1' && response.data.result.length > 0) {
			return response.data.result[0].hash;
		} else {
			throw new Error('No transactions found for the wallet address.');
		}
	} catch (error) {
		throw new Error('Error fetching transactions: ' + error.message);
	}
}