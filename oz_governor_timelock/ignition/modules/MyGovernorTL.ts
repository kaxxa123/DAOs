import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import MyVoteToken from "./MyVoteToken";
import MyTimeLock from "./MyTimeLock";

const MyGovernorTLModule = buildModule("MyGovernorTLModule", (m) => {
    const account0 = m.getAccount(0)

    const { vote } = m.useModule(MyVoteToken)
    const { lock } = m.useModule(MyTimeLock)

    const gov = m.contract(
        "MyGovernorTL",
        [vote, lock],
        { after: [vote, lock] })

    const PROPOSER_ROLE = m.staticCall(lock, "PROPOSER_ROLE")
    const CANCELLER_ROLE = m.staticCall(lock, "CANCELLER_ROLE")
    const DEFAULT_ADMIN_ROLE = m.staticCall(lock, "DEFAULT_ADMIN_ROLE")
    const one = m.call(lock, "grantRole", [PROPOSER_ROLE, gov], { id: "TIMELOCK_GRANTROLE1" })
    const two = m.call(lock, "grantRole", [CANCELLER_ROLE, gov], { id: "TIMELOCK_GRANTROLE2" })
    m.call(lock, "revokeRole", [DEFAULT_ADMIN_ROLE, account0], { after: [one, two] })

    return { vote, lock, gov };
});

export default MyGovernorTLModule;
