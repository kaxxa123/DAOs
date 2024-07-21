import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { MyVoteToken } from "../typechain-types";

describe("Testing vote supply and delegation", function () {
    let vote: MyVoteToken;

    it("Should deploy contracts", async function () {
        const [account0] = await hre.ethers.getSigners()

        const VoteFactory = await hre.ethers.getContractFactory("MyVoteToken")
        vote = await VoteFactory.deploy(account0);
    });

    it("Should snapshot supply changes on minting...", async function () {
        const [account0] = await hre.ethers.getSigners()
        const amnt = 3n * 10n ** 18n;
        await mine(10n);
        let blk0 = await time.latestBlock();

        await vote.mint(account0, amnt);
        await mine(5n);
        let blk1 = await time.latestBlock();

        await vote.mint(account0, amnt);
        await mine(5n);
        let blk2 = await time.latestBlock();

        // Se should be able to track the total supply history...
        expect(await vote.getPastTotalSupply(blk0 - 1)).to.equal(0)
        expect(await vote.getPastTotalSupply(blk1 - 1)).to.equal(amnt)
        expect(await vote.getPastTotalSupply(blk2 - 1)).to.equal(2n * amnt)

        // Account has not yet delegated
        expect(await vote.delegates(account0)).to.equal('0x0000000000000000000000000000000000000000')

        // Hence account has zero checkpoints
        expect(await vote.numCheckpoints(account0)).to.equal('0')

        // Account itself has zero voting power, since there was no self-delegation.
        expect(await await vote.getVotes(account0)).to.equal('0')
    });

});
