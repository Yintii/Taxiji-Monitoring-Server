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
const pendingEthTransactions = new Map();

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


  walletProcesses.set(wallet_to_monitor, process);
  console.log('Process started successfully');

  process.on('message', ( async (data) => {
    console.log('Message received: ', data)
    switch(data.chain){
      case 'Ethereum':
        if (!pendingEthTransactions.has(user)) {
          pendingEthTransactions.set(user, [data]);
        } else {
          const transactions = pendingEthTransactions.get(user);
          transactions.push(data);
          pendingEthTransactions.set(user, transactions);
        }
        break;
      case 'Polygon':
        //pendingPolygonTransactions.push(data);
        break;
      case 'Base':
        //pendingBaseTransactions.push(data);
        break;
      case 'Arbitrum':
        //pendingArbitrumTransactions.push(data);
        break;
      case 'Optimism':
        //pendingOptimismTransactions.push(data);
        break;
      default:
        console.log('Invalid chain');
    }
  }));

  res.status(200).send('Process started successfully');
});

//destroy wallet
app.post('/api/wallet_stop/', (req, res) => {
  const { wallet_to_monitor} = req.body;
  
  if(!walletProcesses.has(wallet_to_monitor)){
    return res.status(400).send('No running process found for this wallet');
  }

  const process = walletProcesses.get(wallet_to_monitor);
 
  process.kill()

  walletProcesses.delete(wallet_to_monitor);

  console.log(`Process for ${wallet_to_monitor} stopped successfully`);
  res.status(200).send(`Process for ${wallet_to_monitor} stopped successfully.`);
});

//a simple route that will show what the pending transactions are
app.get('/api/pending_transactions/:user_id/', (req, res) => {
  const user_id = Number(req.params.user_id);
  if (!pendingEthTransactions.has(user_id)) {
    return res.status(200).json({message: 'No pending transactions found for this user'});
  }
  const transactions = pendingEthTransactions.get(user_id);
  res.status(200).json(transactions);
});

//a route to remove the pending transactions when they're settled
app.delete('/api/pending_transactions/:user_id/', (req, res) => {
  //get the hash from the request body
  const hash = req.body.hash;
  const user_id = Number(req.params.user_id);
  console.log('Received request to remove transaction with hash: ', hash, ' for user: ', user_id);
  if (!pendingEthTransactions.has(user_id)) {
    return res.status(200).json({message: 'No pending transactions found for this user'});
  }
  const transactions = pendingEthTransactions.get(user_id);
  //filter out the transaction with the hash
  const updatedTransactions = transactions.filter((transaction) => transaction.hash !== hash);
  //update the pending transactions map
  pendingEthTransactions.set(user_id, updatedTransactions);
  //send a response
  res.status(200).json({message: 'Transaction removed successfully'});
});

app.get('/', (req, res) => {
  res.status(200).send('Welcome to the api');
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
