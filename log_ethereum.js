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

const subscription = web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
	if (error) {
		console.error('Error on subscription: ', error);
		return;
	}

	(async () => {
		try {
			const block = await web3.eth.getBlock(blockHeader.number, true);
			console.log("Block number: ", block.number);

			const transaction = block.transactions.find((tx) => tx.to === targetWalletAddress || tx.from === targetWalletAddress);
			if (!transaction) return;

			const value = parseInt(transaction.value);
			console.log('Value of transaction: ', value);

			const withholdingAmt = ethers.formatEther(BigInt(value) * BigInt(2) / BigInt(10));
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
			if (error.code === 430 || error.code === 101 || error.code === 506) return;
			console.error('Error on transaction detection: ', error);
		}
	})();
});

process.on('exit', () => {
	subscription.unsubscribe((error, success) => {
		if (success) {
			console.log('Successfully unsubscribed!');
		}
	});
});
