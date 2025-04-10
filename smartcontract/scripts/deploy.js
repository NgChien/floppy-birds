const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Bắt đầu quá trình deploy...");
  
  // Deploy Floppy contract
  console.log("Đang deploy Floppy contract...");
  const Floppy = await hre.ethers.getContractFactory("Floppy");
  const floppy = await Floppy.deploy();
  await floppy.waitForDeployment();
  const floppyAddress = await floppy.getAddress();
  console.log("Floppy đã được deploy tại địa chỉ:", floppyAddress);

  // Tạo thư mục config nếu chưa tồn tại
  const configDir = path.join(__dirname, "..", "config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  // Lưu thông tin deploy vào file config
  const config = {
    floppy: {
      address: floppyAddress,
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      deploymentTime: new Date().toISOString(),
    }
  };

  const configPath = path.join(configDir, "deployment.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Đã lưu thông tin deploy vào:", configPath);

  // Cập nhật địa chỉ contract trong web3Modal.js
  const web3ModalPath = path.join(__dirname, "../../game/js/web3/web3Modal.js");
  
  try {
    let web3ModalContent = fs.readFileSync(web3ModalPath, 'utf8');
    
    // Thay thế địa chỉ contract cũ bằng địa chỉ mới
    web3ModalContent = web3ModalContent.replace(
      /const FLOPPY_ADDRESS = "0x[a-fA-F0-9]+";/,
      `const FLOPPY_ADDRESS = "${floppyAddress}";`
    );
    
    fs.writeFileSync(web3ModalPath, web3ModalContent);
    console.log("Đã cập nhật địa chỉ contract trong web3Modal.js");
  } catch (error) {
    console.error("Lỗi khi cập nhật web3Modal.js:", error);
  }

  console.log("Quá trình deploy hoàn tất!");
}

main().catch((error) => {
  console.error("Lỗi trong quá trình deploy:", error);
  process.exitCode = 1;
}); 