import express from 'express'
import { fork } from 'child_process'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url';
import cors from 'cors'

import EventEmitter from 'events'
const eventEmitter = new EventEmitter();

const app = express()
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const walletProcesses = new Map();

let process;

app.use(express.json());
app.use(cors());

app.post('/api/wallet_submit', (req, res) => {
  const { wallet_address } = req.body;
  if (walletProcesses.has(wallet_address)){
    return res.status(400).send('Process already running for this wallet.');
  }

  process = fork(path.join(__dirname, 'log_wallet.js'), [wallet_address]);

  walletProcesses.set(wallet_address, process);
  console.log('Process started successfully');

  process.on('message', ((data) => {
    eventEmitter.emit('wallet_transaction', data);
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

app.get('/api/wallet_transactions', (req, res)=>{
  eventEmitter.once('wallet_transaction', (data)=>{
    res.json(data);
  });

  process.send({ action: 'startProcessing' });
});

app.listen(port, ()=>{
	console.log(`server listening at http://localhost:${port}`);
});
