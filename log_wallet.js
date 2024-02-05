import Web3 from 'web3';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const sepoliaApiUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_API_KEY}`;
const web3 = new Web3(sepoliaApiUrl);

const targetWalletAddress = process.argv[2].toLowerCase();


const subscription = (await web3.eth.subscribe('pendingTransactions'));



console.log('Listening for transactions on wallet: ', targetWalletAddress);

subscription.on('data', async (txHash) => {
    try {
        const tx = await web3.eth.getTransaction(txHash);
        
        // Check if tx is not undefined and has the value field
        if (tx && tx.value) {
            if (tx.to === targetWalletAddress || tx.from === targetWalletAddress) {
                console.log('Transaction detected: ', txHash);
                console.log('Transaction data: ', tx);
                console.log('Transaction amount: ', ethers.formatEther(tx.value));
                console.log('Transaction withholding amount: ', ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10)));

		const withholdingAmt = ethers.formatEther(BigInt(tx.value) * BigInt(2) / BigInt(10));
		const provider = ethers.getDefaultProvider(sepoliaApiUrl);
		const signer = new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, provider);

		const withholdingTransaction = {
			to: '0x66D96228559500a475Fd54bB673C00f35ca91a59',
			value: ethers.parseEther(withholdingAmt)
		}

		console.log(withholdingTransaction);

		try {
		  console.log(wss.clients.size);
		  wss.clients.forEach(client => {
			console.log(client);
			if (client.readyState === WebSocket.OPEN){
				const msg = JSON.stringify({
					signal: 'show_popup',
					withholdingTransaction
				})
				client.send(msg);
			}
		  });
		}catch (error){
			console.error('Error showing popup');
		}
		     
            }
        }
    } catch (error) {
        if (error.code === 430 || error.code === 101) return;
        console.error('Error on transaction detection: ', error);
    }
});

