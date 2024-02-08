import Web3 from 'web3';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetWalletAddress = process.argv[2];

const subscription = (await web3.eth.subscribe('pendingTransactions'));

let pendingTransactions = [];

console.log('Listening for transactions on wallet: ', targetWalletAddress);

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
				console.log('Attempting to log withholding transaction: ', withholdingTransaction);
				try {
					pendingTransactions.push(withholdingTransaction);
					console.log("Pending transactions: ", pendingTransactions);
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
