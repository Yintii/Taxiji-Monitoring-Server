import express from 'express'
import { fork } from 'child_process'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url';
import cors from 'cors'

const app = express()
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const walletProcesses = new Map();
const pendingTransactions = new Map();


app.use(express.json());
app.use(cors());


app.post('/api/wallet_submit', (req, res) => {
  const { wallet_address } = req.body;
  if (!wallet_address) {
    return res.status(400).send('Please provide a wallet address');
  }
  if (walletProcesses.has(wallet_address)){
    return res.status(400).send('Process already running for this wallet.');
  }

  const process = fork(path.join(__dirname, 'log_wallet.js'), [wallet_address.toLowerCase()]);

  walletProcesses.set(wallet_address, process);
  console.log('Process started successfully');

  process.on('message', ( async (data) => {
    console.log('Message received from child process: ', data);
    try{
      pendingTransactions.set(wallet_address.toLowerCase(), data);  // Store the pending transactions in a map
      console.log('Pending transactions: ', pendingTransactions);
    }catch(error){
      console.error('Error storing pending transactions: ', error);
    }
  }));

  res.status(200).send('Process started successfully');
});


app.post('/api/wallet_stop/', (req, res)=>{
  const { wallet_address } = req.body;
  
  if(!walletProcesses.has(wallet_address)){
    return res.status(400).send('No running process found for this wallet');
  }

  const process = walletProcesses.get(wallet_address);
 
  process.kill()

  walletProcesses.delete(wallet_address);

  console.log(`Process for ${wallet_address} stopped successfully`);
  res.status(200).send(`Process for ${wallet_address} stopped successfully.`);
});



//a simple route that will show what the pending transactions are
app.get('/api/pending_transactions/:wallet_address', (req, res) => {
  const wallet = req.params.wallet_address.toLowerCase();
  if (!pendingTransactions.has(wallet)) {
    return res.status(404).send('No pending transactions found for this wallet');
  }
  const transactions = pendingTransactions.get(wallet);
  res.status(200).json(transactions);
});


app.listen(port, ()=>{
	console.log(`server listening at http://localhost:${port}`);
});
