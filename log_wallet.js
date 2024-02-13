import Web3 from 'web3';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetWalletAddress = process.argv[2];

const subscription = (await web3.eth.subscribe('pendingTransactions'));

// let pendingTransactions = [];

console.log('Listening for transactions on wallet: ', targetWalletAddress);

subscription.on('data', async (txHash) => {
    try {
        const tx = await web3.eth.getTransaction(txHash);
        // Check if tx is not undefined and has the value field
        if (tx && tx.value) {


			// Check if the transaction is not to the contract
			let notToContract = tx.to !== process.env.SEPOLIA_CONTRACT_ADDRESS;

			if (notToContract && tx.from === targetWalletAddress || notToContract && tx.to === targetWalletAddress) {
				console.log('Transaction detected: ', tx);

				console.log('Contract address: ', process.env.SEPOLIA_CONTRACT_ADDRESS);
				

				console.log("Not to cotract: ", notToContract);
				console.log("tx.from: ", tx.from);
				console.log("tx.to: ", tx.to);

				let first_clause = notToContract && tx.from === targetWalletAddress;
				let second_clause = notToContract && tx.to === targetWalletAddress;

				console.log("First clause: ", first_clause);
				console.log("Second clause: ", second_clause);


				const withholdingAmt = ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10));
				const withholdingTransaction = {
					user_withholding_wallet: process.env.SEPOLIA_WITHHOLDING_WALLET,
					amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
					hash: txHash
				};
				try {
					//pendingTransactions.push(withholdingTransaction);
					process.send(withholdingTransaction);
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
