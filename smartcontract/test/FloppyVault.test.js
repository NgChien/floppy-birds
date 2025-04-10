const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Floppy và Vault Contract", function () {
  let floppy;
  let vault;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy Floppy contract
    const Floppy = await ethers.getContractFactory("Floppy");
    floppy = await Floppy.deploy();
    await floppy.waitForDeployment();
    const floppyAddress = await floppy.getAddress();

    // Deploy Vault contract với địa chỉ của Floppy
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(floppyAddress);
    await vault.waitForDeployment();

    // Cấp quyền WITHDRAWER_ROLE cho owner
    const WITHDRAWER_ROLE = await vault.WITHDRAWER_ROLE();
    await vault.grantRole(WITHDRAWER_ROLE, owner.address);
  });

  describe("Floppy Contract", function () {
    it("Nên có tên và symbol đúng", async function () {
      expect(await floppy.name()).to.equal("Floppy");
      expect(await floppy.symbol()).to.equal("FLP");
    });

    it("Nên mint token thành công", async function () {
      const amount = ethers.parseEther("1000");
      await floppy.mint(owner.address, amount);
      expect(await floppy.balanceOf(owner.address)).to.equal(amount);
    });

    it("Nên chuyển token thành công", async function () {
      const amount = ethers.parseEther("1000");
      await floppy.mint(owner.address, amount);
      await floppy.transfer(addr1.address, amount);
      expect(await floppy.balanceOf(addr1.address)).to.equal(amount);
    });
  });

  describe("Vault Contract", function () {
    it("Nên deposit token thành công", async function () {
      const amount = ethers.parseEther("1000");
      await floppy.mint(owner.address, amount);
      await floppy.approve(await vault.getAddress(), amount);
      await vault.deposit(amount);
      expect(await floppy.balanceOf(await vault.getAddress())).to.equal(amount);
    });

    it("Nên withdraw token thành công", async function () {
      const amount = ethers.parseEther("1000");
      await floppy.mint(owner.address, amount);
      await floppy.approve(await vault.getAddress(), amount);
      await vault.deposit(amount);
      
      // Bật chức năng withdraw và set max amount
      await vault.setWithdrawEnable(true);
      await vault.setMaxWithdrawAmount(amount);
      
      await vault.withdraw(amount, owner.address);
      expect(await floppy.balanceOf(owner.address)).to.equal(amount);
    });

    it("Không nên cho phép withdraw khi chưa bật chức năng", async function () {
      const amount = ethers.parseEther("1000");
      await floppy.mint(owner.address, amount);
      await floppy.approve(await vault.getAddress(), amount);
      await vault.deposit(amount);
      
      await expect(vault.withdraw(amount, owner.address)).to.be.revertedWith(
        "Withdraw is not available"
      );
    });

    it("Không nên cho phép withdraw quá max amount", async function () {
      const amount = ethers.parseEther("1000");
      const maxAmount = ethers.parseEther("500"); // Set max amount là 500 token
      
      await floppy.mint(owner.address, amount);
      await floppy.approve(await vault.getAddress(), amount);
      await vault.deposit(amount);
      
      await vault.setWithdrawEnable(true);
      await vault.setMaxWithdrawAmount(maxAmount);
      
      await expect(vault.withdraw(amount, owner.address)).to.be.revertedWith(
        "Exceed maximum amount"
      );
    });
  });
}); 