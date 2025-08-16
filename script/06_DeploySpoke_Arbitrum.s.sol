// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {SpokeRedeemOApp} from "../contracts/async/SpokeRedeemOApp.sol";

contract DeploySpoke_Arbitrum is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");

        uint32 hubEid        = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
        address hubComposer  = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");

        address lzEndpointArb = vm.envAddress("LZ_ENDPOINT_ARB_SEPOLIA");
        address shareOFTArb   = vm.envAddress("SHARE_OFT_ARB");

        vm.startBroadcast(pk);
        SpokeRedeemOApp spokeArb = new SpokeRedeemOApp(lzEndpointArb, shareOFTArb);
        spokeArb.setHub(hubEid, hubComposer);
        vm.stopBroadcast();

        console2.log("SpokeRedeemOApp (Arb):", address(spokeArb));
    }
}


