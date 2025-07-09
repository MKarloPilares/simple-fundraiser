const {expect} = require("chai")
const {ethers} = require("hardhat")

describe("fundraise", function () {
    let fundraise, owner, addr1, addr2

    beforeEach(async() => {
      [owner, addr1, addr2] = await ethers.getSigners();
      const Fundraise = await ethers.getContractFactory("FundRaiser");
      fundraise = await Fundraise.deploy();
    })

    it("Should only allow the owner to start an event", async() => {
      await expect(fundraise.connect(addr1).startRaising(ethers.parseEther("10"), 60, ethers.parseEther("1"))).to.be.revertedWith("Only the owner can perform this action")
    });

    it("Should initialize a fundraiser and allow contributions", async() => {
      await fundraise.startRaising(ethers.parseEther("10"), 60, ethers.parseEther("1"));

      await expect(fundraise.startRaising(ethers.parseEther("10"), 60, ethers.parseEther("1"))).to.be.revertedWith("Fundraising has already started!");

      await fundraise.connect(addr1).contribute({value: ethers.parseEther("1")});
      expect(await fundraise.getBalance(addr1.address)).to.equal(ethers.parseEther("1"))
    });

    it("Should allow the owner to withdraw the balance once the event has ended", async() => {
      await fundraise.startRaising(ethers.parseEther("10"), 60, ethers.parseEther("6"));

      await fundraise.connect(addr1).contribute({value: ethers.parseEther("5")});
      await fundraise.connect(addr2).contribute({value: ethers.parseEther("5")});

      await expect(fundraise.withdraw()).to.be.revertedWith("Event still going!");
      
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await fundraise.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * tx.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expectedChange = ethers.parseEther("10") - gasUsed
      expect(balanceAfter - balanceBefore).to.equal(expectedChange);
    });

    it("Should allow users to refund their contributions if the goal was not reached", async() => {
      await fundraise.startRaising(ethers.parseEther("10"), 60, ethers.parseEther('5'));

      await fundraise.connect(addr1).contribute({value: ethers.parseEther("5")});
      await fundraise.connect(addr2).contribute({value: ethers.parseEther("4")});

      await expect(fundraise.connect(addr1).refund()).to.be.revertedWith("Event still going!");

      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");

      const balanceBefore = await ethers.provider.getBalance(addr2);
      const tx = await fundraise.connect(addr2).refund();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * tx.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(addr2);

      const expectedChange = ethers.parseEther("4") - gasUsed;
      expect(balanceAfter - balanceBefore).to.equal(expectedChange)
    });

    it("Should allow owner to pause and unpause events", async() => {
      await fundraise.startRaising(ethers.parseEther("10"), 60, ethers.parseEther("5"));

      await fundraise.pauseEvent();

      await expect(fundraise.connect(addr1).contribute({value: ethers.parseEther("2")})).to.be.revertedWith("Event is paused!");

      await fundraise.unpauseEvent();

      await fundraise.connect(addr1).contribute({value: ethers.parseEther("2")});

      expect(await fundraise.getBalance(addr1)).to.be.equal(ethers.parseEther("2"))

    })
})