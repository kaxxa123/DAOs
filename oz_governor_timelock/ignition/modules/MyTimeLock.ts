import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MyTimeLockModule = buildModule("MyTimeLockModule", (m) => {
    const account0 = m.getAccount(0);

    const lock = m.contract("MyTimeLock", [
        5 * 60,    // Lock Delay length 5min (for a 1s/block config)
        [],        // Proposers
        ["0x0000000000000000000000000000000000000000"], // Executors (all)
        account0]); // Admin
    return { lock };
});

export default MyTimeLockModule;
