// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IComposerHub {
    function setPeer(uint32 eid, bytes32 peer) external;
    function setAsOperatorFor(address controller, bool approved) external;
}

contract WireHub_Peers_And_Operator is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");

        uint32 arbEid  = uint32(vm.envUint("LZ_EID_ARB_SEPOLIA"));
        uint32 ethEid  = uint32(vm.envUint("LZ_EID_SEPOLIA"));

        address composerHub  = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");
        address spokeArb     = vm.envAddress("SPOKE_REDEEM_OAPP_ARB");
        address spokeEth     = vm.envAddress("SPOKE_REDEEM_OAPP_SEPOLIA");
        address controllerAA = vm.envAddress("CONTROLLER_ADDRESS");

        vm.startBroadcast(pk);

        IComposerHub(composerHub).setPeer(arbEid, bytes32(uint256(uint160(spokeArb))));
        IComposerHub(composerHub).setPeer(ethEid, bytes32(uint256(uint160(spokeEth))));

        IComposerHub(composerHub).setAsOperatorFor(controllerAA, true);

        vm.stopBroadcast();

        console2.log("Hub wired:");
        console2.log("  composer:", composerHub);
        console2.log("  spokeArb :", spokeArb);
        console2.log("  spokeEth :", spokeEth);
        console2.log("  operator:", controllerAA);
    }
}


