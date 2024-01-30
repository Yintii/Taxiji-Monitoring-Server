import Web3 from 'web3';
import dotenv from 'dotenv';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetWalletAddress = process.argv[2].toLowerCase();

let subscription = (await web3.eth.subscribe('pendingTransactions'));

console.log('Listening for transactions on wallet: ', targetWalletAddress);

subscription.on('data', async (txHash) => {
    try {
        const tx = await web3.eth.getTransaction(txHash);
        if(tx.to === targetWalletAddress || tx.from === targetWalletAddress){
            console.log('Transaction detected: ', txHash);
        }
    }
    catch(error){
        if (error.code === 430) return;
        console.error('Error on transaction detection: ', error);
    }
});
