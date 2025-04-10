const Web3 = window.Web3;
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;

// Contract addresses on Tea Sepolia
const FLOPPY_ADDRESS = "0xE5988a85eCC4Cc85C71d63F1816F45317Ac507a4";

// Network configuration
const CHAIN_ID = 10218;
const NETWORK_NAME = "Tea Sepolia";
const RPC_URL = "https://tea-sepolia.g.alchemy.com/public";
const EXPLORER_URL = "https://sepolia.tea.xyz/tx/";
const CURRENCY_SYMBOL = "TEA";

// Gas configuration
const GAS_FEE = 500000;
const GAS_FEE_APPROVAL = 60000;

// Global variables
let web3Modal;
let provider;
let web3;
let selectedAccount;
let accountInfo;

// Contract ABI
const FLOPPY_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "buyTicket",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "startGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "points",
                "type": "uint256"
            }
        ],
        "name": "claimReward",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "tickets",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Update testnet explorer URL
const TESTNET_BSCSCAN = EXPLORER_URL;

// Utility function to shorten address
function shortAddress(addr) {
  if (!addr) return '';
  return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

// Initialize Web3Modal
async function init() {
  try {
    console.log("Initializing web3 modal");
    
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask to play the game!");
      return;
    }

    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          rpc: {
            [CHAIN_ID]: RPC_URL
          },
          network: NETWORK_NAME.toLowerCase(),
          chainId: CHAIN_ID,
          networkId: CHAIN_ID
        }
      },
    };

    web3Modal = new Web3Modal({
      cacheProvider: true,
      providerOptions,
      network: NETWORK_NAME.toLowerCase(),
      chainId: CHAIN_ID,
      disableInjectedProvider: false
    });

    console.log("Web3Modal instance created");

    if (web3Modal.cachedProvider) {
      console.log("Found cached provider, attempting to reconnect...");
      try {
        await onConnect();
      } catch (error) {
        console.error("Failed to reconnect with cached provider:", error);
        await web3Modal.clearCachedProvider();
      }
    }
  } catch (error) {
    console.error("Failed to initialize Web3Modal:", error);
    alert("Unable to connect wallet. Please try again later!");
  }
}

// Hàm kiểm tra và chuyển đổi mạng Tea
async function checkAndSwitchNetwork() {
  try {
    const chainId = await web3.eth.getChainId();
    
    // Nếu đã ở mạng Tea thì không cần làm gì
    if (chainId == CHAIN_ID) {
      return true;
    }

    // Thử chuyển đổi mạng
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
      return true;
    } catch (switchError) {
      // Nếu mạng chưa được thêm vào ví
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: NETWORK_NAME,
                nativeCurrency: {
                  name: CURRENCY_SYMBOL,
                  symbol: CURRENCY_SYMBOL,
                  decimals: 18
                },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: [EXPLORER_URL]
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Lỗi khi thêm mạng Tea:', addError);
          return false;
        }
      }
      console.error('Lỗi khi chuyển đổi mạng:', switchError);
      return false;
    }
  } catch (error) {
    console.error('Lỗi khi kiểm tra mạng:', error);
    return false;
  }
}

// Connect wallet
async function onConnect() {
  try {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask to play the game!");
      return;
    }

    provider = await web3Modal.connect();
    web3 = new Web3(provider);
    
    // Check and switch network
    const networkSwitched = await checkAndSwitchNetwork();
    if (!networkSwitched) {
      alert("Unable to switch to Tea network. Please try again!");
      return;
    }
    
    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }
    selectedAccount = accounts[0];
    
    // Add event listeners
    provider.on("accountsChanged", (accounts) => {
      if (!accounts || accounts.length === 0) {
        onDisconnect();
      } else {
        selectedAccount = accounts[0];
        fetchAccountData();
      }
    });

    provider.on("chainChanged", (chainId) => {
      window.location.reload();
    });

    // Update UI
    const walletConnect = document.querySelector("#walletConnect");
    const walletInfo = document.querySelector("#wallet-info");
    const walletInfoContainer = document.querySelector(".wallet-information");

    if (walletConnect) walletConnect.style.display = "none";
    if (walletInfoContainer) walletInfoContainer.style.display = "flex";
    
    await fetchAccountData();
    
  } catch (e) {
    console.error("Failed to connect wallet:", e);
    if (e.code === 4001) {
      alert("Connection rejected by user");
    } else {
      alert("Unable to connect wallet. Please try again!");
    }
    await onDisconnect();
  }
}

// Disconnect wallet
async function onDisconnect() {
  try {
    if (provider) {
      // Remove event listeners
      provider.removeAllListeners("accountsChanged");
      provider.removeAllListeners("chainChanged");
      
      if (provider.close) {
        await provider.close();
      }
    }
    
    await web3Modal.clearCachedProvider();
    provider = null;
    selectedAccount = null;
    web3 = null;
    
    // Reset UI
    const walletConnect = document.querySelector("#walletConnect");
    const walletInfoContainer = document.querySelector(".wallet-information");
    const walletInfo = document.querySelector("#wallet-info");
    
    if (walletConnect) walletConnect.style.display = "flex";
    if (walletInfoContainer) walletInfoContainer.style.display = "none";
    if (walletInfo) walletInfo.innerHTML = "";
    
    // Reset any other UI elements that might show wallet info
    const currentTickets = document.querySelector("#current-tickets");
    const currentBalance = document.querySelector("#current-balance");
    
    if (currentTickets) currentTickets.textContent = "0";
    if (currentBalance) currentBalance.textContent = `0 ${CURRENCY_SYMBOL}`;
    
  } catch (e) {
    console.error("Error on disconnect:", e);
    // Even if there's an error, we should still try to reset the UI
    document.querySelector("#walletConnect").style.display = "flex";
    document.querySelector(".wallet-information").style.display = "none";
    document.querySelector("#wallet-info").innerHTML = "";
  }
}

// Get ticket balance
async function getTicketBalance(address) {
  try {
    const floppyContract = new web3.eth.Contract(FLOPPY_ABI, FLOPPY_ADDRESS);
    const balance = await floppyContract.methods.tickets(address).call();
    return balance.toString();
  } catch (error) {
    console.error('Failed to get ticket balance:', error);
    return '0';
  }
}

// Fetch account data
async function fetchAccountData() {
  try {
    if (!web3 || !selectedAccount) return;

    // Get balance
    const balance = await web3.eth.getBalance(selectedAccount);
    const ethBalance = web3.utils.fromWei(balance, "ether");
    console.log("Balance:", ethBalance);

    // Get ticket balance
    let tickets = '0';
    let flpBalance = '0';
    if (FLOPPY_ADDRESS !== "0x0000000000000000000000000000000000000000") {
      tickets = await getTicketBalance(selectedAccount);
      // Get FLP balance
      const floppyContract = new web3.eth.Contract(FLOPPY_ABI, FLOPPY_ADDRESS);
      const flpWei = await floppyContract.methods.balanceOf(selectedAccount).call();
      flpBalance = web3.utils.fromWei(flpWei, "ether");
      console.log("FLP balance:", flpBalance);
    }

    accountInfo = {
      walletAddress: selectedAccount,
      balance: ethBalance,
      tickets: tickets,
      flpBalance: flpBalance,
      chainId: CHAIN_ID
    };

    // Cập nhật UI chỉ khi các element tồn tại
    const walletInfo = document.querySelector("#wallet-info");
    const walletInfoContainer = document.querySelector('.wallet-information');
    const walletConnect = document.querySelector("#walletConnect");
    const currentTickets = document.querySelector("#current-tickets");
    const currentBalance = document.querySelector("#current-balance");

    if (walletInfo) {
      walletInfo.innerHTML = `
        <div class="wallet-content">
          <div class="wallet-header">
            <div class="wallet-address">
              <span class="address-value">${shortAddress(selectedAccount)}</span>
            </div>
          </div>
          <div class="wallet-body">
            <div class="balance-row">
              <div class="balance-item">
                <span class="balance-label">${CURRENCY_SYMBOL}</span>
                <span class="balance-value">${Math.floor(parseFloat(ethBalance))}</span>
              </div>
              <div class="balance-item">
                <span class="balance-label">Tickets</span>
                <span class="balance-value">${tickets}</span>
              </div>
              <div class="balance-item">
                <span class="balance-label">FLP</span>
                <span class="balance-value">${Math.floor(parseFloat(flpBalance))}</span>
              </div>
            </div>
          </div>
          <div class="wallet-footer">
            <button id="convert-container" class="action-button primary">Buy Ticket</button>
            <button id="disconnect-wallet" class="action-button secondary">Disconnect</button>
          </div>
        </div>
      `;

      // Gắn lại event listeners cho các nút mới
      document.querySelector("#convert-container").addEventListener("click", onShowBuyTicketModal);
      document.querySelector("#disconnect-wallet").addEventListener("click", onDisconnect);
    }

    // Cập nhật số ticket và balance trong form mua nếu element tồn tại
    if (currentTickets) {
      currentTickets.textContent = tickets;
    }
    if (currentBalance) {
      currentBalance.textContent = `${Math.floor(parseFloat(ethBalance))} ${CURRENCY_SYMBOL}`;
    }

    // Hiển thị/ẩn các phần tử UI nếu tồn tại
    if (walletInfoContainer) {
      walletInfoContainer.style.display = 'flex';
    }
    if (walletConnect) {
      walletConnect.style.display = "none";
    }

    // Thêm style nếu chưa tồn tại
    if (!document.querySelector('#wallet-info-style')) {
      const style = document.createElement('style');
      style.id = 'wallet-info-style';
      style.textContent = `
        .wallet-content {
          background: linear-gradient(135deg, #00b09b, #96c93d);
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .wallet-header {
          margin-bottom: 15px;
          text-align: center;
        }

        .wallet-address {
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 15px;
          border-radius: 20px;
          display: inline-block;
        }

        .address-value {
          color: white;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .wallet-body {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .balance-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .balance-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .balance-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .balance-value {
          color: white;
          font-size: 18px;
          font-weight: bold;
        }

        .wallet-footer {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-button {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-button.primary {
          background: #ffffff;
          color: #00b09b;
        }

        .action-button.primary:hover {
          background: #f0f0f0;
          transform: translateY(-1px);
        }

        .action-button.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .action-button.secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .wallet-information {
          margin-bottom: 20px;
        }
      `;
      document.head.appendChild(style);
    }

  } catch (error) {
    console.error('Error fetching account data:', error);
    alert('Unable to connect wallet. Please try again.');
  }
}

// Buy ticket handler
async function onBuyTicket() {
  try {
    const ticketAmount = parseInt($("#from-ticket").val());
    
    // Validate input
    if (!ticketAmount || isNaN(ticketAmount) || ticketAmount <= 0) {
      alert("Please enter a valid ticket amount!");
      return;
    }

    // Check wallet connection
    if (!selectedAccount) {
      alert("Please connect your wallet first!");
      return;
    }

    $("#btn-convert").attr("disabled", true);
    $("#processing").show();

    // Calculate total cost in TEA (1 ticket = 1 TEA)
    const totalCostInWei = web3.utils.toWei(ticketAmount.toString(), 'ether');
    
    // Check balance
    const balance = await web3.eth.getBalance(selectedAccount);
    if (web3.utils.toBN(balance).lt(web3.utils.toBN(totalCostInWei))) {
      throw new Error("Insufficient balance to buy ticket");
    }

    console.log('Buying tickets:', ticketAmount, 'Cost in TEA:', web3.utils.fromWei(totalCostInWei, 'ether'));
    
    const floppyContract = new web3.eth.Contract(FLOPPY_ABI, FLOPPY_ADDRESS);
    
    // Estimate gas with a reasonable limit
    const gasEstimate = await floppyContract.methods.buyTicket(ticketAmount).estimateGas({
      from: selectedAccount,
      value: totalCostInWei
    });

    // Add 20% buffer but cap at 2x estimate
    const gasLimit = Math.min(Math.round(gasEstimate * 1.2), gasEstimate * 2);

    // Send transaction
    const tx = await floppyContract.methods.buyTicket(ticketAmount).send({ 
      from: selectedAccount,
      value: totalCostInWei,
      gas: gasLimit
    });

    console.log('Transaction successful:', tx);
    
    // Update balances and reset form
    await fetchAccountData();
    $("#from-ticket").val("");
    $("#to-ticket").val("");
    
    // Hide the deposit-withdraw modal
    $("#deposit-withdraw").hide();
    
    // Show success message
    alert(`Successfully bought ${ticketAmount} tickets!`);
    
  } catch (error) {
    console.error('Buy ticket error:', error);
    let errorMessage = "Unable to buy ticket. ";
    
    if (error.code === 4001) {
      errorMessage = "Transaction cancelled by user.";
    } else if (error.message.includes("Insufficient balance")) {
      errorMessage = "Insufficient balance to buy ticket.";
    } else if (error.message.includes("Invalid TEA amount")) {
      errorMessage = "Invalid TEA amount.";
    } else if (error.message.includes("execution reverted")) {
      errorMessage = "Transaction failed. Please check your balance and try again.";
    } else {
      errorMessage += "Please check your balance and try again.";
    }
    
    alert(errorMessage);
  } finally {
    $("#btn-convert").attr("disabled", false);
    $("#processing").hide();
  }
}

// Show buy ticket modal
function onShowBuyTicketModal() {
  const depositWithdraw = $("#deposit-withdraw");
  if (depositWithdraw.is(":visible")) {
    depositWithdraw.hide();
  } else {
    depositWithdraw.show();
    
    // Cập nhật giá trị mặc định
    $("#from-ticket").val(1);
    $("#to-ticket").val(1);
    
    // Thêm xử lý sự kiện khi thay đổi số lượng ticket
    $("#from-ticket").on("input", function() {
      const ticketAmount = $(this).val();
      $("#to-ticket").val(ticketAmount);
    });
  }
}

// Initialize
$(document).ready(function() {
  init();
  
  $("#walletConnect").click(onConnect);
  $("#disconnect-wallet").click(onDisconnect);
  $("#btn-convert").click(onBuyTicket);
  $("#processing").hide();
  $("#deposit-withdraw").hide();
  
  // Initialize dialog
  $("#dialog").dialog({
    autoOpen: false,
    modal: true
  });
});
