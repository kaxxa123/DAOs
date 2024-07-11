import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import MyVoteToken from "./MyVoteToken"

const MyGovernorModule = buildModule("MyGovernorModule", (m) => {
    const { token } = m.useModule(MyVoteToken);

    const gov = m.contract(
        "MyGovernor",
        [token],
        { after: [token] });

    return { gov };
});

export default MyGovernorModule;
