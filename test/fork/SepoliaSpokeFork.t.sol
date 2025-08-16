// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";

interface ISpokeRedeemOApp {
    function hubEid() external view returns (uint32);
    function hubComposerB32() external view returns (bytes32);
}
interface IOAppPeers { function peers(uint32 eid) external view returns (bytes32); }

contract SepoliaSpokeForkTest is Test {
    function test_sepolia_spoke_wiring() external {
        // fork
        vm.createSelectFork(vm.envString("SEPOLIA_RPC"));

        // env
        uint32 hubEid = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
        address hubComposer = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");
        address spokeRedeem = vm.envAddress("SPOKE_REDEEM_OAPP_SEPOLIA");

        // asserts, tolerate older spoke that doesn't expose hubEid()/hubComposerB32()
        try ISpokeRedeemOApp(spokeRedeem).hubEid() returns (uint32 he) {
            assertEq(he, hubEid);
            assertEq(ISpokeRedeemOApp(spokeRedeem).hubComposerB32(), bytes32(uint256(uint160(hubComposer))));
        } catch {
            // fall back to OApp peers mapping
            assertEq(IOAppPeers(spokeRedeem).peers(hubEid), bytes32(uint256(uint160(hubComposer))));
        }
    }
}


