import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";
import { MyGovernorTL, MyTimeLock, MyVoteToken, USDToken } from "../typechain-types";

describe("End-to-End Governor Test", function () {

    // Contrats
    let usd: USDToken;
    let vote: MyVoteToken;
    let gov: MyGovernorTL;
    let lock: MyTimeLock;

    // Vote Allocation
    const totalVoters = 6n;
    const amountVote = 5n * 10n ** 18n;

    //Proposal
    const grantAmount: bigint = 3n * 10n ** 18n
    const proposalText: string = "Proposal #1: Give grant to winner"
    const proposalHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(proposalText))
    let proposalId: bigint
    let winnerAddress: string
    let targetContract: USDToken;
    let transferCalldata: string;


    it("Should deploy contracts", async function () {
        const [account0] = await hre.ethers.getSigners()

        const USDFactory = await hre.ethers.getContractFactory("USDToken")
        const VoteFactory = await hre.ethers.getContractFactory("MyVoteToken")
        const GovFactory = await hre.ethers.getContractFactory("MyGovernorTL")
        const LockFactory = await hre.ethers.getContractFactory("MyTimeLock")

        lock = await LockFactory.deploy(5 * 60, [], ["0x0000000000000000000000000000000000000000"], account0);
        usd = await USDFactory.deploy(account0);
        vote = await VoteFactory.deploy(account0);
        gov = await GovFactory.deploy(vote, lock);

        let voteAddr = await vote.getAddress()
        expect(await usd.symbol()).to.equal("UST")
        expect(await vote.symbol()).to.equal("MVT")
        expect(await gov.token()).to.equal(voteAddr)
    });

    it("Should set timelock roles", async function () {
        const [account0] = await hre.ethers.getSigners()
        const PROPOSER_ROLE = await lock.PROPOSER_ROLE()
        const CANCELLER_ROLE = await lock.CANCELLER_ROLE()
        const DEFAULT_ADMIN_ROLE = await lock.DEFAULT_ADMIN_ROLE()

        expect(await lock.hasRole(PROPOSER_ROLE, gov)).to.be.false
        expect(await lock.hasRole(CANCELLER_ROLE, gov)).to.be.false
        expect(await lock.hasRole(DEFAULT_ADMIN_ROLE, account0)).to.be.true

        await lock.grantRole(PROPOSER_ROLE, gov)
        await lock.grantRole(CANCELLER_ROLE, gov)
        await lock.revokeRole(DEFAULT_ADMIN_ROLE, account0);

        expect(await lock.hasRole(PROPOSER_ROLE, gov)).to.be.true
        expect(await lock.hasRole(CANCELLER_ROLE, gov)).to.be.true
        expect(await lock.hasRole(DEFAULT_ADMIN_ROLE, account0)).to.be.false
    });

    it("Should distribute voting tokens", async function () {
        const accounts = await hre.ethers.getSigners()

        for (let cnt = 0; cnt < totalVoters; cnt++) {
            await expect(
                vote.mint(accounts[cnt], amountVote)
            ).to.changeTokenBalances(vote, [accounts[cnt]], [amountVote]);
        }

        expect(await vote.totalSupply()).to.equal(totalVoters * amountVote);
    });

    it("Should handover vote token ownership to Governor", async function () {
        const [account0] = await hre.ethers.getSigners()

        expect(await vote.owner()).to.equal(account0)
        await vote.connect(account0).transferOwnership(lock)

        expect(await vote.owner()).to.equal(lock)
    });

    it("Should delegate voting power to oneself", async function () {
        const accounts = await hre.ethers.getSigners()

        for (let cnt = 0; cnt < totalVoters; cnt++) {
            await vote.connect(accounts[cnt]).delegate(accounts[cnt])
        }

        // Verify delegation
        // let blk = await hre.ethers.provider.getBlockNumber()
        let blk = await time.latestBlock();
        await mine();

        for (let cnt = 0; cnt < totalVoters; cnt++) {
            let votePower = await gov.getVotes(accounts[1], blk)
            expect(votePower).to.equal(amountVote)
        }
    });

    it("Should submit transfer proposal", async function () {
        await usd.mint(lock, 100n * 10n ** 18n)

        const [account0] = await hre.ethers.getSigners()
        winnerAddress = account0.address
        targetContract = usd;
        transferCalldata = targetContract.interface.encodeFunctionData('transfer', [winnerAddress, grantAmount])

        await gov.propose(
            [targetContract],
            [0],
            [transferCalldata],
            proposalText
        )

        // Get voting proposal id
        proposalId = await gov.hashProposal(
            [targetContract],
            [0],
            [transferCalldata],
            proposalHash
        )

        expect(await gov.state(proposalId)).to.equal(0)
    });

    it("Should start voting", async function () {

        // Current block
        const now: bigint = BigInt(await time.latestBlock());

        // Vote start block
        const start = await gov.proposalSnapshot(proposalId)

        // Mine blocks...
        expect(start).to.greaterThan(now)
        await mine(start - now + 1n);

        expect(await gov.state(proposalId)).to.equal(1)
    });

    it("Should submit votes", async function () {
        const accounts = await hre.ethers.getSigners()

        await gov.connect(accounts[0]).castVote(proposalId, 0)
        await gov.connect(accounts[1]).castVote(proposalId, 1)
        await gov.connect(accounts[2]).castVote(proposalId, 2)
        await gov.connect(accounts[4]).castVote(proposalId, 1)
        await gov.connect(accounts[5]).castVote(proposalId, 1)

        await expect(
            gov.connect(accounts[3]).castVote(proposalId, 3)
        ).to.be.revertedWithCustomError(gov, "GovernorInvalidVoteType");

        expect(await gov.hasVoted(proposalId, accounts[2])).to.true
        expect(await gov.hasVoted(proposalId, accounts[3])).to.false

        let [no, yes, abstain] = await gov.proposalVotes(proposalId)

        expect(no).to.equals(amountVote)
        expect(yes).to.equals(amountVote * 3n)
        expect(abstain).to.equals(amountVote)

        const now: bigint = BigInt(await time.latestBlock())
        mine()
        expect(await gov.quorum(now)).to.lessThan(yes + abstain)
    });

    it("Should apporve proposal", async function () {

        // Current block
        const now: bigint = BigInt(await time.latestBlock());

        // Vote start block
        const end = await gov.proposalDeadline(proposalId)
        await mine(end - now + 1n);

        expect(await gov.state(proposalId)).to.equal(4)
    });

    it("Should execute proposal", async function () {
        expect(await gov.proposalNeedsQueuing(proposalId)).to.true
        expect(await targetContract.balanceOf(winnerAddress)).to.equal(0)

        await gov.queue(
            [targetContract],
            [0],
            [transferCalldata],
            proposalHash
        )

        // Determine queuing time length
        let now = await time.latest()
        let eta = await gov.proposalEta(proposalId)
        expect(eta).to.be.greaterThan(now)

        // advance time to exceed ETA
        await time.increaseTo(eta + 1n);
        mine()

        now = await time.latest()
        expect(eta).to.be.lessThan(now)

        await expect(
            gov.execute(
                [targetContract],
                [0],
                [transferCalldata],
                proposalHash
            )
        ).to.emit(gov, "ProposalExecuted").withArgs(proposalId);

        expect(await targetContract.balanceOf(winnerAddress)).to.equal(grantAmount)
    });
});
