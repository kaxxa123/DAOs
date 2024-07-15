# OpenZeppelin v5 Governor+Timelock DAO

Step-by-step test of a Governor DAO, with a timelock.

To quickly run an end-to-end test of all the steps:
```BASH
REPORT_GAS=true npx hardhat test  ./test/end-to-end.ts
```

1. Project is also configured for installation on Avalanche Fuji.
    Ensure all hardhat environment variables are configured:

    ```BASH
    # Already configured variables
    npx hardhat vars list

    # Project variables needed
    npx hardhat vars setup

    # Set missing variables
    npx hardhat vars set SECRET_KEY_0
    npx hardhat vars set SECRET_KEY_1
    npx hardhat vars set SECRET_KEY_2
    npx hardhat vars set SECRET_KEY_3
    npx hardhat vars set SECRET_KEY_4
    npx hardhat vars set SECRET_KEY_5
    ```

    See Avalanche fuji deployment contract addresses [here](./ignition/deployments/chain-43113/deployed_addresses.json).

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

    const LockFactory = await ethers.getContractFactory("MyTimeLock")
    const VoteFactory = await ethers.getContractFactory("MyVoteToken")
    const USDFactory = await ethers.getContractFactory("USDToken")
    const GovFactory = await ethers.getContractFactory("MyGovernorTL")

    // Pick the correct chain
    const chain_node = "chain-31337"
    const chain_fuji = "chain-43113"
    const chain_type = chain_node

    fs = require("fs")
    fs.readFile(`./ignition/deployments/${chain_type}/deployed_addresses.json`, 'utf8',
                        (err, data) => contract_addrs = JSON.parse(data.split('#').join('_')))

    let lock = await LockFactory.attach(contract_addrs.MyTimeLockModule_MyTimeLock)
    let vote = await VoteFactory.attach(contract_addrs.MyVoteTokenModule_MyVoteToken)
    let usd = await USDFactory.attach(contract_addrs.USDTokenModule_USDToken)
    let gov = await GovFactory.attach(contract_addrs.MyGovernorTLModule_MyGovernorTL)
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
    await gov.getVotes(accounts[1].address, blk-1)
    ```

1. Submit voting proposal

    ```JS
    // The number of votes required for a voter to become a proposer.
    await gov.proposalThreshold()

    await usd.mint(lock, 100n*10n**18n)

    const winnerAddress = accounts[5].address
    const grantAmount = 3n*10n**18n
    const transferCalldata = usd.interface.encodeFunctionData('transfer', [winnerAddress, grantAmount])
    const proposalText = "Proposal #1: Give grant to team"

    await gov.propose(
        [usd],
        [0],
        [transferCalldata],
        proposalText
    )

    // Get voting proposal id
    bytesDesc = ethers.toUtf8Bytes(proposalText)
    proposalHash = ethers.keccak256(bytesDesc)

    proposalId = await gov.hashProposal(
        [usd],
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
    // Local: 300 blocks ~  5min
    // Fuji:  300 blocks ~ 22min
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
    await gov.quorum(blk-1)
    ```

1. Execute proposal

    ```JS
    // Voting end block
    // Local: 600 blocks ~ 10min
    // Fuji:  600 blocks ~ 45min
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
        [usd],
        [0],
        [transferCalldata],
        proposalHash
    )

    // Time when queued proposal becomes executable
    // Uses timelock "time" measure rather than the gov's clock
    await gov.proposalEta(proposalId)

    // Get last block timestamp
    blk = await ethers.provider.getBlockNumber()
    (await ethers.provider.getBlock(blk-1)).timestamp

    // Execute proposal after ETA exceeded...
    await gov.execute(
        [usd],
        [0],
        [transferCalldata],
        proposalHash
    )

    // Check if execution was correct.
    await usd.balanceOf(lock)
    await usd.balanceOf(winnerAddress)
    ```
