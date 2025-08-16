// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {SpokeRedeemOApp} from "../contracts/async/SpokeRedeemOApp.sol";

contract DeploySpoke_Sepolia is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");

        uint32 hubEid        = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
        address hubComposer  = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");

        address lzEndpointEth = vm.envAddress("LZ_ENDPOINT_SEPOLIA");
        address shareOFTEth   = vm.envAddress("SHARE_OFT_SEPOLIA");

        vm.startBroadcast(pk);
        SpokeRedeemOApp spokeEth = new SpokeRedeemOApp(lzEndpointEth, shareOFTEth);
        spokeEth.setHub(hubEid, hubComposer);
        vm.stopBroadcast();

        console2.log("SpokeRedeemOApp (Sepolia):", address(spokeEth));
    }
}


