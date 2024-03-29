import express from 'express'
import { fork } from 'child_process'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import fs from 'fs'

const app = express()
const port = 3000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const walletProcesses = new Map();
const pendingTransactions = new Map();


app.use(express.json());
app.use(cors());

//create wallet
app.post('/api/wallet_submit/', (req, res) => {
  const wallet_to_monitor = req.body.wallet;
  const wallet_to_monitor_address = wallet_to_monitor.wallet_address.toLowerCase();
  const user = wallet_to_monitor.user_id;
  const withholding_wallet = req.body.withholding_wallet;

  if (!wallet_to_monitor) {
    return res.status(400).send('Please provide a wallet address');
  }
  if (walletProcesses.has(wallet_to_monitor)){
    return res.status(400).send('Process already running for this wallet.');
  }

  let process;

  switch(wallet_to_monitor.chain){
    case 'Ethereum':
      console.log('Starting process for Ethereum');
      process = fork(path.join(__dirname, 'log_ethereum.js'), [wallet_to_monitor_address, withholding_wallet]);
      break;
    case 'Polygon':
      console.log('Starting process for Polygon');
      process = fork(path.join(__dirname, 'log_polygon.js'), [wallet_to_monitor_address, withholding_wallet]);
      break;
    case 'Base':
      console.log('Starting process for Base');
      process = fork(path.join(__dirname, 'log_base.js'), [wallet_to_monitor_address, withholding_wallet]);
      break;
    case 'Arbitrum':
      console.log('Starting process for Arbitrum');
      process = fork(path.join(__dirname, 'log_arbitrum.js'), [wallet_to_monitor_address, withholding_wallet]);
      break;
    case 'Optimism':
      console.log('Starting process for Optimism');
      process = fork(path.join(__dirname, 'log_optimism.js'), [wallet_to_monitor_address, withholding_wallet]);
      break;
    default:
      return res.status(400).send('Invalid chain');
  }


  //write the wallet to monitor and it's process to a file /processes/wallets_to_monitor.txt
  const data = {
    wallet: wallet_to_monitor,
    process: process
  };

  const filePath = './processes/wallets_to_monitor.json';

  // Read existing data from the file
  let existingData = [];
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    existingData = JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading existing data from file:', error);
  }

  // Append new data to the existing data
  existingData.push(data);

  // Write the updated data to the file
  try {
    const dataString = JSON.stringify(existingData);
    fs.writeFileSync(filePath, dataString);
    walletProcesses.set(wallet_to_monitor.wallet_address, process);
    console.log('Process added to the file successfully.');
  } catch (error) {
    console.error('Error writing data to file:', error);
  }
  console.log('Process started successfully');

  process.on('message', ( async (data) => {
    console.log('Message received: ', data)
    console.log('Received transaction: ', data);
    if (!pendingTransactions.has(user)) {
      pendingTransactions.set(user, [data]);
      console.log('Successfully added transaction to pending transactions list.')
    } else {
      try {
        const transactions = pendingTransactions.get(user);
        transactions.push(data);
        pendingTransactions.set(user, transactions);
        console.log('Successfully added transaction to pending transactions list.')
      } catch (error) {
        console.error('Error adding transaction to pending transactions list: ', error);
      }
    }
  }));

  res.status(200).send('Process started successfully');
});

//destroy wallet
app.post('/api/wallet_stop/', async (req, res) => {
  const { wallet_address } = req.body;
  if(!walletProcesses.has(wallet_address)){
   return res.status(400).send('No running process found for this wallet');
  }

  try{

  const process = walletProcesses.get(wallet_address);
 
  process.kill()

  walletProcesses.delete(wallet_address);
  console.log('Wallet processes after deleting the process in question: ', walletProcesses);
  
  //remove the wallet from the file
  const filePath = './processes/wallets_to_monitor.json';
  let existingData = [];
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    existingData = JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading existing data from file:', error);
  }

  //filter out the wallet to stop
  const updatedData = existingData.filter((data) => data.wallet.wallet_address !== wallet_address);

  // Write the updated data to the file
  try {
    const dataString = JSON.stringify(updatedData);
    fs.writeFileSync
    (filePath, dataString);
    console.log('Process removed from the file successfully.');
  }
  catch (error) {
    console.error('Error writing data to file:', error);
  }
  
  console.log(`Process for ${wallet_address} stopped successfully`);
  res.status(200).send(`Process for ${wallet_address} stopped successfully.`);
  }catch (error){
   console.error("There was an error getting rid of the wallet: ", error);	
  }
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


app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});


function readProcessesFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  }catch (error) {
    console.error('Error reading existing data from file:', error);
  }
}

function restartProcesses(processes){

}