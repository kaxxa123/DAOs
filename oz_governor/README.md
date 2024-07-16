# OpenZeppelin v5 Basic Governor DAO

Step-by-step test of the simplest Governor DAO, without a timelock.

To quicly run an end-to-end test of all the steps:
```BASH
REPORT_GAS=true npx hardhat test  ./test/end-to-end.ts
```

1. Start test node on localhost

    ```BASH
    npx hardhat node
    ```

1. Deploy DAO contracts and start node interface...

    ```BASH
    npx hardhat ignition deploy ./ignition/modules/deploy.ts  --network localhost

    npx hardhat console --network localhost
    ```

1. Hook-up contract objects

    ```JS
    accounts = await ethers.getSigners()

    const VoteFactory = await ethers.getContractFactory("MyVoteToken")
    const GovFactory = await ethers.getContractFactory("MyGovernor")
    const USDFactory = await ethers.getContractFactory("USDToken")

    // Pick the correct chain
    const chain_node = "chain-31337"
    const chain_type = chain_node

    fs = require("fs")
    util = require('util')
    readFile = util.promisify(fs.readFile)
    contract_data = await readFile(`./ignition/deployments/${chain_type}/deployed_addresses.json`, 'utf8')
    contract_addrs = JSON.parse(contract_data.split('#').join('_'))

    let vote = await VoteFactory.attach(contract_addrs.MyVoteTokenModule_MyVoteToken)
    let usd = await USDFactory.attach(contract_addrs.USDTokenModule_USDToken)
    let gov = await GovFactory.attach(contract_addrs.MyGovernorModule_MyGovernor)
    ```

1. Distribute voting tokens and assign voting power.

    ```JS
    // Distribute voting tokens
    await vote.mint(accounts[0], 5n*10n**18n)
    await vote.mint(accounts[1], 5n*10n**18n)
    await vote.mint(accounts[2], 5n*10n**18n)
    await vote.mint(accounts[3], 5n*10n**18n)
    await vote.mint(accounts[4], 5n*10n**18n)
    await vote.mint(accounts[5], 5n*10n**18n)

    // Delegate voting power to oneself
    await vote.connect(accounts[0]).delegate(accounts[0])
    await vote.connect(accounts[1]).delegate(accounts[1])
    await vote.connect(accounts[2]).delegate(accounts[2])
    await vote.connect(accounts[3]).delegate(accounts[3])
    await vote.connect(accounts[4]).delegate(accounts[4])
    await vote.connect(accounts[5]).delegate(accounts[5])

    // Voting power of an account at a specific timepoint
    await gov.getVotes(accounts[1], 0)

    blk = await ethers.provider.getBlockNumber()
    await gov.getVotes(accounts[1], blk-1)
    ```

1. Surrender vote token ownership to the Governor contract.

    ```BASH
    await vote.transferOwnership(gov)
    await vote.owner()
    ```

1. Submit proposal

    __Example 1: Transferring our fake USD Token__

    ```JS
    // The number of votes required for a voter to become a proposer.
    await gov.proposalThreshold()
    await usd.mint(gov, 100n*10n**18n)

    const winnerAddress = accounts[5].address
    const grantAmount = 3n*10n**18n
    const targetContract = usd;
    const transferCalldata = targetContract.interface.encodeFunctionData('transfer', [winnerAddress, grantAmount])
    const proposalText = "Proposal #1: Give USD grant to team"

    await gov.propose(
        [targetContract],
        [0],
        [transferCalldata],
        proposalText
    )

    // Get voting proposal id
    bytesDesc = ethers.toUtf8Bytes(proposalText)
    proposalHash = ethers.keccak256(bytesDesc)

    proposalId = await gov.hashProposal(
        [targetContract],
        [0],
        [transferCalldata],
        proposalHash
    )
    ```

    <BR />

    __Example 2: Minting voting tokens__

    ```JS
    // The number of votes required for a voter to become a proposer.
    await gov.proposalThreshold()

    const winnerAddress = accounts[5].address
    const voteAmount = 2n*10n**18n
    const targetContract = vote;
    const transferCalldata = targetContract.interface.encodeFunctionData('mint', [winnerAddress, voteAmount])
    const proposalText = "Proposal #2: Mint votes for account 5"

    await gov.propose(
        [targetContract],
        [0],
        [transferCalldata],
        proposalText
    )

    // Get voting proposal id
    bytesDesc = ethers.toUtf8Bytes(proposalText)
    proposalHash = ethers.keccak256(bytesDesc)

    proposalId = await gov.hashProposal(
        [targetContract],
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
    await gov.hasVoted(proposalId, accounts[2])
    await gov.hasVoted(proposalId, accounts[3])

    // Get voting result
    await gov.proposalVotes(proposalId)

    // Minimum number of votes for a proposal to be successful.
    blk = await ethers.provider.getBlockNumber()
    await gov.quorum(blk-1)
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

    // Proposal shouldn't need queuing...
    await gov.proposalNeedsQueuing(proposalId)

    // Execute proposal without queuing
    await gov.execute(
        [targetContract],
        [0],
        [transferCalldata],
        proposalHash
    )

    // Check if execution was correct.
    await targetContract.balanceOf(gov)
    await targetContract.balanceOf(winnerAddress)
    ```
