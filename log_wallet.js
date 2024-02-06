import Web3 from 'web3';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetWalletAddress = process.argv[2].toLowerCase();

const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

console.log('Listening for transactions on wallet: ', targetWalletAddress);

const subscription = web3.eth.subscribe('pendingTransactions');

subscription.on('data', async (txHash) => {
	try {
		const tx = await web3.eth.getTransaction(txHash);

		// Check if tx is not undefined and has the value field
		if (tx && tx.value) {
			if (tx.to === targetWalletAddress || tx.from === targetWalletAddress) {
				const withholdingAmt = ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10));
				const withholdingTransaction = {
					from: targetWalletAddress,
					to: '0x66D96228559500a475Fd54bB673C00f35ca91a59',
					value: ethers.parseEther(withholdingAmt).toString(),
				};
				eventEmitter.emit('transactionDetected', withholdingTransaction);
			}
		}
	} catch (error) {
		if (error.code === 430 || error.code === 101) return;
		console.error('Error on transaction detection: ', error);
	}
});

export default eventEmitter;
