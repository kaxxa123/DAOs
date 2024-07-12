# OpenZeppelin v5 Basic Governor DAO

Step-by-step test of the simplest Governor DAO, without a timelock.

To quicly run an end-to-end test of all the steps:
```BASH
npx hardhat test  ./test/end-to-end.ts
```

1. Start test node on localhost

    ```BASH
    # REPORT_GAS=true npx hardhat test
    npx hardhat node
    ```

1. Deploy DAO contracts and start node interface...

    ```BASH
    npx hardhat ignition deploy ./ignition/modules/MyGovernor.ts  --network localhost
    npx hardhat ignition deploy ./ignition/modules/USDToken.ts    --network localhost

    npx hardhat console --network localhost
    ```

1. Hook-up contract objects

    ```JS
    accounts = await ethers.getSigners()

    const VoteFactory = await ethers.getContractFactory("MyVoteToken")
    const GovFactory = await ethers.getContractFactory("MyGovernor")
    const USDFactory = await ethers.getContractFactory("USDToken")

    let vote = await VoteFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3")
    let gov = await GovFactory.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512")
    let usd = await USDFactory.attach("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0")
    ```

1. Distribute voting tokens and assign voting power.

    ```JS
    // Distribute voting tokens
    await vote.mint(accounts[0].address, 5n*10n**18n)
    await vote.mint(accounts[1].address, 5n*10n**18n)
    await vote.mint(accounts[2].address, 5n*10n**18n)
    await vote.mint(accounts[3].address, 5n*10n**18n)
    await vote.mint(accounts[4].address, 5n*10n**18n)
    await vote.mint(accounts[5].address, 5n*10n**18n)

    // Delegate voting power to oneself
    await vote.connect(accounts[0]).delegate(accounts[0].address)
    await vote.connect(accounts[1]).delegate(accounts[1].address)
    await vote.connect(accounts[2]).delegate(accounts[2].address)
    await vote.connect(accounts[3]).delegate(accounts[3].address)
    await vote.connect(accounts[4]).delegate(accounts[4].address)
    await vote.connect(accounts[5]).delegate(accounts[5].address)

    // Voting power of an account at a specific timepoint
    await gov.getVotes(accounts[1].address, 0)

    blk = await ethers.provider.getBlockNumber()
    await gov.getVotes(accounts[1].address, blk)
    ```

1. Submit voting proposal

    ```JS
    // The number of votes required for a voter to become a proposer.
    await gov.proposalThreshold()

    const usdAddr = await usd.getAddress()
    const govAddr = await gov.getAddress()

    await usd.mint(govAddr, 100n*10n**18n)

    const winnerAddress = accounts[9].address
    const grantAmount = 3n*10n**18n
    const transferCalldata = usd.interface.encodeFunctionData('transfer', [winnerAddress, grantAmount])
    const proposalText = "Proposal #1: Give grant to team"

    await gov.propose(
        [usdAddr],
        [0],
        [transferCalldata],
        proposalText
    )

    // Get voting proposal id
    bytesDesc = ethers.toUtf8Bytes(proposalText)
    proposalHash = ethers.keccak256(bytesDesc)

    proposalId = await gov.hashProposal(
        [usdAddr],
        [0],
        [transferCalldata],
        proposalHash
    )
    ```

1. Query proposal info.

    ```JS
    // Query info about proposal
    await gov.proposalProposer(proposalId)

    // Get ProposalState from Pending (0), Active, Canceled, Defeated, Succeeded ...
    await gov.state(proposalId)

    // Voting start block
    await ethers.provider.getBlockNumber()
    await gov.proposalSnapshot(proposalId)

    // Voting end block
    await gov.proposalDeadline(proposalId)
    ```

1. Vote, choosing one option from GovernorCountingSimple::VoteType

    ```JS
    // Against(0), For(1), Abstain(2)
    await gov.connect(accounts[0]).castVote(proposalId, 0)
    await gov.connect(accounts[1]).castVote(proposalId, 1)
    await gov.connect(accounts[2]).castVote(proposalId, 2)
    await gov.connect(accounts[4]).castVote(proposalId, 1)
    await gov.connect(accounts[5]).castVote(proposalId, 1)

    // We only have 3 options - Invalid Vote Type
    await gov.connect(accounts[3]).castVote(proposalId, 3)

    // Check who voted
    await gov.hasVoted(proposalId, accounts[2].address)
    await gov.hasVoted(proposalId, accounts[3].address)

    // Get voting result
    await gov.proposalVotes(proposalId)

    // Minimum number of votes for a proposal to be successful.
    blk = await ethers.provider.getBlockNumber()
    await gov.quorum(blk)
    ```

1. Execute proposal

    ```JS
    // Voting end block
    await ethers.provider.getBlockNumber()
    await gov.proposalDeadline(proposalId)

    // Get ProposalState from Pending (0), Active, Canceled, Defeated, Succeeded ...
    await gov.state(proposalId)

    // Get voting result
    await gov.proposalVotes(proposalId)

    // Does proposal need queuing to execute?
    await gov.proposalNeedsQueuing(proposalId)

    // If queuing required...
    await gov.queue(
        [usdAddr],
        [0],
        [transferCalldata],
        proposalHash
    )

    // Execute proposal without queuing
    await gov.execute(
        [usdAddr],
        [0],
        [transferCalldata],
        proposalHash
    )

    // Check if execution was correct.
    await usd.balanceOf(govAddr)
    await usd.balanceOf(winnerAddress)
    ```
