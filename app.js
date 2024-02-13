import express from 'express'
import { fork } from 'child_process'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url';
import cors from 'cors'
import fs from 'fs'
import https from 'https'

const privateKey = fs.readFileSync('private.pem', 'utf8');
const certificate = fs.readFileSync('csr.pem', 'utf8');

const app = express()
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const walletProcesses = new Map();
const pendingTransactions = new Map();

app.use(express.json());
app.use(cors());

//creat wallet
app.post('/api/wallet_submit/', (req, res) => {
  const { wallet_address, user_id } = req.body;
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
      //spread the current pending transactions for the user and add data
      const userTransactions = pendingTransactions.get(user_id) || [];
      pendingTransactions.set(user_id, [...userTransactions, data]);
    }catch(error){
      console.error('Error storing pending transactions: ', error);
    }
  }));

  res.status(200).send('Process started successfully');
});

//destroy wallet
app.post('/api/wallet_stop/', (req, res) => {
  const { wallet_address, user_id} = req.body;
  
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
app.get('/api/pending_transactions/:user_id/', (req, res) => {
  const user_id = Number(req.params.user_id);
  if (!pendingTransactions.has(user_id)) {
    return res.status(200).json({message: 'No pending transactions found for this user'});
  }
  const transactions = pendingTransactions.get(user_id);
  res.status(200).json(transactions);
});

//a route to remove the pending transactions when they're settled
app.delete('/api/pending_transactions/:user_id/', (req, res) => {
  //get the hash from the request body
  const hash = req.body.hash;
  const user_id = Number(req.params.user_id);
  console.log('Received request to remove transaction with hash: ', hash, ' for user: ', user_id);
  if (!pendingTransactions.has(user_id)) {
    return res.status(200).json({message: 'No pending transactions found for this user'});
  }
  const transactions = pendingTransactions.get(user_id);
  //filter out the transaction with the hash
  const updatedTransactions = transactions.filter((transaction) => transaction.hash !== hash);
  //update the pending transactions map
  pendingTransactions.set(user_id, updatedTransactions);
  //send a response
  res.status(200).json({message: 'Transaction removed successfully'});
});

https.createServer({
  key: privateKey,
  cert: certificate
}, app).listen(port);
