import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import MyVoteToken from "./MyVoteToken"

const MyGovernorModule = buildModule("MyGovernorModule", (m) => {
    const { vote } = m.useModule(MyVoteToken);

    const gov = m.contract(
        "MyGovernor",
        [vote],
        { after: [vote] });

    return { vote, gov };
});

export default MyGovernorModule;
