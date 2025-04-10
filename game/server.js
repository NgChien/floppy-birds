const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS
app.use(cors());
app.use(bodyParser.json());

// Network Configuration
const networkConfig = {
  chainId: parseInt(process.env.CHAIN_ID || "10218"),
  name: 'Tea Sepolia',
  rpcUrl: process.env.RPC_URL || "https://tea-sepolia.g.alchemy.com/public",
  gasLimit: parseInt(process.env.GAS_LIMIT || "500000"),
  gasPrice: parseInt(process.env.GAS_PRICE || "10000000000")
};

// Contract addresses
const FLOPPY_CONTRACT_ADDRESS = process.env.FLOPPY_CONTRACT_ADDRESS;
console.log("Loading contract address:", FLOPPY_CONTRACT_ADDRESS);

if (!FLOPPY_CONTRACT_ADDRESS) {
  console.error("FLOPPY_CONTRACT_ADDRESS is not set in environment variables");
  process.exit(1);
}

// Contract ABIs
const FLOPPY_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function tickets(address) view returns (uint256)",
  "function buyTicket(uint256 amount) payable",
  "function claimReward(uint256 points)",
  "event TicketPurchased(address indexed player, uint256 amount)",
  "event RewardClaimed(address indexed player, uint256 points, uint256 reward)"
];

// Initialize Web3 provider
const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);

// Initialize contract
const floppyContract = new ethers.Contract(FLOPPY_CONTRACT_ADDRESS, FLOPPY_ABI, provider);

// Helper function to check contract connection
async function checkContractConnection() {
  try {
    console.log("Checking network connection...");
    const network = await provider.getNetwork();
    console.log("Connected to network:", network);

    console.log("Checking Floppy contract...");
    const ticketBalance = await floppyContract.tickets("0x0000000000000000000000000000000000000000");
    console.log("Contract is responding. Test balance:", ticketBalance.toString());

    return true;
  } catch (error) {
    console.error("Contract connection error:", error);
    return false;
  }
}

// API Endpoints
app.get('/api/getTicketBalance', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      throw new Error("Address is required");
    }
    console.log("Checking ticket balance for address:", address);
    const balance = await floppyContract.tickets(address);
    console.log("Ticket balance:", balance.toString());
    res.json({ data: balance.toString(), mess: 'Success', code: 200 });
  } catch (error) {
    console.error("Error getting ticket balance:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deposit', async (req, res) => {
  try {
    const { address, amount, transaction_id } = req.body;
    console.log("Deposit request:", { address, amount, transaction_id });
    // Verify transaction
    const tx = await provider.getTransaction(transaction_id);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    const receipt = await tx.wait();
    if (receipt.status !== 1) {
      throw new Error('Transaction failed');
    }
    res.json({ data: { success: true }, mess: 'Success', code: 200 });
  } catch (error) {
    console.error("Error processing deposit:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/withdraw', async (req, res) => {
  try {
    const { address, amount } = req.body;
    console.log("Withdraw request:", { address, amount });
    // Note: This is just a placeholder. In a real implementation,
    // you would need to handle the actual withdrawal through the contract
    res.json({ data: { success: true }, mess: 'Success', code: 200 });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/startMatch', async (req, res) => {
  try {
    const { address } = req.query;
    console.log("Starting match for address:", address);
    // Generate a unique match ID
    const matchId = Date.now();
    res.json({ data: { matchId }, mess: 'Success', code: 200 });
  } catch (error) {
    console.error("Error starting match:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/endMatch', async (req, res) => {
  try {
    const { address, id, point, matchData } = req.body;
    console.log("End match request:", { address, id, point, matchData });
    // Here you would typically:
    // 1. Verify the match data
    // 2. Calculate rewards based on points
    // 3. Update user's balance
    res.json({ data: { success: true }, mess: 'Success', code: 200 });
  } catch (error) {
    console.error("Error ending match:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Network config:", networkConfig);
  console.log(`Floppy Contract: ${FLOPPY_CONTRACT_ADDRESS}`);
  
  // Check contract connection
  const isConnected = await checkContractConnection();
  if (!isConnected) {
    console.error("Failed to connect to contracts. Please check your configuration.");
    process.exit(1);
  } else {
    console.log("Successfully connected to contracts!");
  }
}); 