# OpemZeppelin DAO Test

1. Start test node on localhost

    ```BASH
    REPORT_GAS=true npx hardhat test
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

    const teamAddress = accounts[9].address
    const grantAmount = 3n*10n**18n
    const transferCalldata = usd.interface.encodeFunctionData('transfer', [teamAddress, grantAmount])
    const proposalText = "Proposal #1: Give grant to team"

    await gov.propose(
        [usdAddr],
        [0],
        [transferCalldata],
        proposalText
    )

    // Get voting proposal id
    bytesDesc = ethers.toUtf8Bytes("Proposal #1: Give grant to team")
    hashDesc = ethers.keccak256(bytesDesc)

    propId = await gov.hashProposal(
        [usdAddr],
        [0],
        [transferCalldata],
        hashDesc
    )
    ```

1. Query proposal info.

    ```JS
    // Query info about proposal
    await gov.proposalProposer(propId)

    // Get ProposalState from Pending (0), Active, Canceled, Defeated, Succeeded ...
    await gov.state(propId)

    // Voting start block
    await ethers.provider.getBlockNumber()
    await gov.proposalSnapshot(propId)

    // Voting end block
    await gov.proposalDeadline(propId)
    ```

1. Vote,  choosing one option from GovernorCountingSimple::VoteType

    ```JS
    // Against(0), For(1), Abstain(2)
    await gov.connect(accounts[0]).castVote(propId, 0)
    await gov.connect(accounts[1]).castVote(propId, 1)
    await gov.connect(accounts[2]).castVote(propId, 2)
    await gov.connect(accounts[4]).castVote(propId, 1)
    await gov.connect(accounts[5]).castVote(propId, 1)

    // We only have 3 options - Invalid Vote Type
    await gov.connect(accounts[3]).castVote(propId, 3)

    // Check who voted
    await gov.hasVoted(propId, accounts[2].address)
    await gov.hasVoted(propId, accounts[3].address)

    // Get voting result
    await gov.proposalVotes(propId)

    // Minimum number of votes for a proposal to be successful.
    blk = await ethers.provider.getBlockNumber()
    await gov.quorum(blk)
    ```

1. Execute proposal

    ```JS
    // Voting end block
    await ethers.provider.getBlockNumber()
    await gov.proposalDeadline(propId)

    // Get ProposalState from Pending (0), Active, Canceled, Defeated, Succeeded ...
    await gov.state(propId)

    // Get voting result
    await gov.proposalVotes(propId)

    // Does proposal need queuing to execute?
    await gov.proposalNeedsQueuing(propId)

    // If queuing required...
    await gov.queue(
        [usdAddr],
        [0],
        [transferCalldata],
        hashDesc
    )

    // Execute proposal without queuing
    await gov.execute(
        [usdAddr],
        [0],
        [transferCalldata],
        hashDesc
    )

    // Check if execution was correct.
    await usd.balanceOf(govAddr)
    await usd.balanceOf(accounts[9].address)
    ```
