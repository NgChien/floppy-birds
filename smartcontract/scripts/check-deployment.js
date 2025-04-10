const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Kiểm tra trạng thái deploy...");
  
  const configPath = path.join(__dirname, "..", "config", "deployment.json");
  
  if (!fs.existsSync(configPath)) {
    console.log("Chưa tìm thấy file deployment.json. Hãy chạy script deploy trước.");
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  console.log("\nThông tin deploy:");
  console.log("----------------");
  console.log("Mạng:", config.coinFlip.network);
  console.log("Chain ID:", config.coinFlip.chainId);
  console.log("Địa chỉ hợp đồng:", config.coinFlip.address);
  console.log("Thời gian deploy:", config.coinFlip.deploymentTime);
  
  // Kiểm tra trạng thái hợp đồng
  try {
    const coinFlip = await hre.ethers.getContractAt("CoinFlip", config.coinFlip.address);
    const balance = await hre.ethers.provider.getBalance(config.coinFlip.address);
    console.log("\nTrạng thái hợp đồng:");
    console.log("----------------");
    console.log("Số dư:", hre.ethers.formatEther(balance), "ETH");
    console.log("Hợp đồng hoạt động bình thường!");
  } catch (error) {
    console.error("Lỗi khi kiểm tra hợp đồng:", error);
  }
}

main().catch((error) => {
  console.error("Lỗi:", error);
  process.exitCode = 1;
}); 