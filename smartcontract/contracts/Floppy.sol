//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Floppy is
    ERC20("Floppy", "FLP"),
    ERC20Burnable,
    Ownable
{
    using SafeMath for uint256;
    uint256 private cap = 50_000_000_000 * 10**uint256(18);
    uint256 private _totalMinted = 0;

    // Mapping để lưu số ticket của mỗi người chơi
    mapping(address => uint256) public tickets;
    
    // Sự kiện khi mua ticket
    event TicketPurchased(address indexed player, uint256 amount);
    

    
    // Sự kiện khi nhận thưởng
    event RewardClaimed(address indexed player, uint256 points, uint256 reward);

    constructor() {
        transferOwnership(msg.sender);
    }

    // Hàm mua ticket, 1 TEA = 1 ticket
    function buyTicket(uint256 amount) external payable {
        require(msg.value == amount * (1 ether), "Incorrect TEA amount");
        tickets[msg.sender] = tickets[msg.sender].add(amount);
        emit TicketPurchased(msg.sender, amount);
    }


    // Hàm nhận thưởng, 1 điểm = 1000 FLP token
    function claimReward(uint256 points) external {
        require(points > 0, "Points must be greater than 0");
        require(tickets[msg.sender] > 0, "No tickets available");
        uint256 reward = points.mul(1000 * 10**uint256(18)); // 1000 FLP token per point
        require(_totalMinted.add(reward) <= cap, "Floppy: cap exceeded");
        
        _totalMinted = _totalMinted.add(reward);
        _mint(msg.sender, reward);
        tickets[msg.sender] = tickets[msg.sender].sub(1);
        
        emit RewardClaimed(msg.sender, points, reward);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(
            _totalMinted.add(amount) <= cap,
            "Floppy: cap exceeded"
        );
        _totalMinted = _totalMinted.add(amount);
        _mint(to, amount);
    }

    // Hàm rút toàn bộ TEA từ contract
    function withdrawTEA() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No TEA to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
