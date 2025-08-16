// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {SpokeRedeemOApp} from "../contracts/async/SpokeRedeemOApp.sol";

interface IComposerHub {
    function _setPeer(uint32 eid, bytes32 peer) external;
    function setAsOperatorFor(address controller, bool approved) external;
}

contract DeploySpokes_And_Wire is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");

        // EIDs
        uint32 baseEid = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
        uint32 arbEid  = uint32(vm.envUint("LZ_EID_ARB_SEPOLIA"));
        uint32 ethEid  = uint32(vm.envUint("LZ_EID_SEPOLIA"));

        // Hub (already deployed by script 05)
        address composerHub = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");

        // Arbitrum spoke params
        address lzEndpointArb = vm.envAddress("LZ_ENDPOINT_ARB_SEPOLIA");
        address shareOFTArb   = vm.envAddress("SHARE_OFT_ARB");

        // Sepolia spoke params
        address lzEndpointEth = vm.envAddress("LZ_ENDPOINT_SEPOLIA");
        address shareOFTEth   = vm.envAddress("SHARE_OFT_SEPOLIA");

        address controllerAA  = vm.envAddress("CONTROLLER_ADDRESS");

        vm.startBroadcast(pk);

        // (1) Deploy spokes
        SpokeRedeemOApp spokeArb = new SpokeRedeemOApp(lzEndpointArb, shareOFTArb);
        SpokeRedeemOApp spokeEth = new SpokeRedeemOApp(lzEndpointEth, shareOFTEth);

        // (2) Wire peers
        spokeArb.setHub(baseEid, composerHub);
        spokeEth.setHub(baseEid, composerHub);
        IComposerHub(composerHub)._setPeer(arbEid,  bytes32(uint256(uint160(address(spokeArb)))));
        IComposerHub(composerHub)._setPeer(ethEid,  bytes32(uint256(uint160(address(spokeEth)))));

        // (3) Operator (controller AA approves composer)
        IComposerHub(composerHub).setAsOperatorFor(controllerAA, true);

        vm.stopBroadcast();

        console2.log("SpokeRedeemOApp (Arb):", address(spokeArb));
        console2.log("SpokeRedeemOApp (Sepolia):", address(spokeEth));
    }
}


