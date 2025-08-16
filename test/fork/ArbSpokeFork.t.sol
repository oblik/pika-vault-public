// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";

interface ISpokeRedeemOApp {
    function hubEid() external view returns (uint32);
    function hubComposerB32() external view returns (bytes32);
}

contract ArbSpokeForkTest is Test {
    function test_arb_spoke_wiring() external {
        // fork
        vm.createSelectFork(vm.envString("ARB_SEPOLIA_RPC"));

        // env
        uint32 hubEid = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
        address hubComposer = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");
        address spokeRedeem = vm.envAddress("SPOKE_REDEEM_OAPP_ARB");

        // asserts
        assertEq(ISpokeRedeemOApp(spokeRedeem).hubEid(), hubEid);
        assertEq(ISpokeRedeemOApp(spokeRedeem).hubComposerB32(), bytes32(uint256(uint160(hubComposer))));
    }
}


