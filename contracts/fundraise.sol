// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract FundRaiser {

    event Contribute(address contributor, uint contribution);
    event Withdraw(address withdrawer, uint amount);
    event Refund(address receiver, uint amount);
    
    address payable public owner;
    mapping(address => uint) public balance;
    uint public deadline;
    uint public goal;
    uint public maxContribution;
    bool public ongoing = false;
    bool public paused = false;

    modifier onlyOwner {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    modifier eventPaused {
        require(!paused, "Event is paused!");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    function startRaising(uint goalInput, uint durationSeconds, uint max) external onlyOwner {
        require(!ongoing, "Fundraising has already started!");

        goal = goalInput;
        maxContribution = max;
        deadline = block.timestamp + durationSeconds;
        ongoing = true;
    }

    function contribute() external payable eventPaused {
        if (block.timestamp > deadline) {
            ongoing = false;
        }
        require(block.timestamp < deadline, "Event has ended!");

        require(balance[msg.sender] + msg.value <= maxContribution, "You have reached the max contribution");

        emit Contribute(msg.sender, msg.value);

        balance[msg.sender] = balance[msg.sender] + msg.value;
    }

    function getBalance(address user) external view returns(uint) {
        return balance[user];
    }

    function withdraw() external onlyOwner eventPaused {
        require(block.timestamp > deadline, "Event still going!");
        require(address(this).balance >= goal, "Goal not reached!");

        emit Withdraw(owner, address(this).balance);

        payable(owner).transfer(address(this).balance);
    }

    function refund() external eventPaused{
        require(block.timestamp > deadline, "Event still going!");
        require(address(this).balance < goal, "Goal has been reached");

        emit Refund(msg.sender, balance[msg.sender]);

        payable(msg.sender).transfer(balance[msg.sender]);
    }

    function getGoal() external view returns(uint) {
        return goal;
    }

    function pauseEvent() external onlyOwner() {
        paused = true;
    }

    function unpauseEvent() external onlyOwner() {
        paused = false;
    }

}
