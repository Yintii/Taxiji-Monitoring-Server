import Web3 from 'web3';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const arbsepApiUrl = `wss://arb-sepolia.g.alchemy.com/v2/${process.env.ARBSEP_API_KEY}`;
const web3 = new Web3(arbsepApiUrl);

const targetWalletAddress = process.argv[2];
const withholding_wallet = process.argv[3];

console.log('Starting process for wallet: ', targetWalletAddress);
console.log('Withholding wallet: ', withholding_wallet);






const subscription = (await web3.eth.subscribe('newBlockHeaders'))
    .on('data', async (blockHeader) => {
        try {
            const block = await web3.eth.getBlock(blockHeader.number, true);
            block.transactions.forEach((tx) => {
                if (tx && tx.value) {
                    // Check if the transaction is not to the contract
                    let notToContract = false; // hardcoded in until I make the arbitrum contract
 
                    if (notToContract && tx.from === targetWalletAddress || notToContract && tx.to === targetWalletAddress) {
                        console.log('Transaction detected: ', txHash);
                        const withholdingAmt = ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10));
                        const withholdingTransaction = {
                            user_withholding_wallet: withholding_wallet,
                            amt_to_withhold: ethers.parseEther(withholdingAmt).toString(),
                            hash: txHash,
                            chain: 'Arbitrum'
                        };
                        try {
                            //pendingTransactions.push(withholdingTransaction);
                            process.send(withholdingTransaction);
                        } catch (error) {
                            console.error('Error sending transaction data: ', error);
                        }
                    }
                } else {
                    console.log("Invalid transaction object:", tx);
                }
            });
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