import Web3 from 'web3';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const WITHHOLDING_WALLET = '0xA0AD8Cda8cA5c43403B03A4C21181b0f6768A580'

const targetWalletAddress = process.argv[2];

const subscription = (await web3.eth.subscribe('pendingTransactions'));

let pendingTransactions = [];

console.log('Listening for transactions on wallet: ', targetWalletAddress);

subscription.on('data', async (txHash) => {
    try {
        const tx = await web3.eth.getTransaction(txHash);
        // Check if tx is not undefined and has the value field
        if (tx && tx.value) {
			if (tx.to === WITHHOLDING_WALLET) return;
			if (tx.to === targetWalletAddress || tx.from === targetWalletAddress) {
				
				const withholdingAmt = ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10));
				const withholdingTransaction = {
					user_withholding_wallet: process.env.SEPOLIA_WITHHOLDING_WALLET,
					amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
				};
				try {
					pendingTransactions.push(withholdingTransaction);
					process.send(pendingTransactions);
				}catch (error){
					console.error('Error sending transaction data: ', error);
				}
            }
        }
    } catch (error) {
        if (error.code === 430 || error.code === 101 || error.code === 506) return;
        console.error('Error on transaction detection: ', error);
    }
});

subscription.on('error', (error) => {
	console.error('Error on subscription: ', error);
});
