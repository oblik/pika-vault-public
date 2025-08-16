// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";

// TODO DODODODODODODOD

interface IComposerHub {
  function _setPeer(uint32 eid, bytes32 peer) external;
  function setAsOperatorFor(address controller, bool approved) external;
}
interface ISpokeRedeem {
  function setHub(uint32 hubEid, address hubComposer) external;
}

contract WireLZPeersAndOperator is Script {
  function run() external {
    uint256 pk = vm.envUint("DEPLOYER_PK");

    // env
    uint32 hubEid   = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
    uint32 spokeEid = uint32(vm.envUint("LZ_EID_ARB_SEPOLIA"));

    address hubComposer   = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");
    address spokeRedeem   = vm.envAddress("SPOKE_REDEEM_OAPP_ARB");
    address controllerAA  = vm.envAddress("CONTROLLER_ADDRESS"); // your smart account

    vm.startBroadcast(pk);

    // 1) set peers both directions
    ISpokeRedeem(spokeRedeem).setHub(hubEid, hubComposer);
    IComposerHub(hubComposer)._setPeer(spokeEid, bytes32(uint256(uint160(spokeRedeem))));

    // 2) operator approval so composer can claim for controller
    IComposerHub(hubComposer).setAsOperatorFor(controllerAA, true);

    vm.stopBroadcast();

    console2.log("Wired peers + operator:");
    console2.log("  hubComposer:", hubComposer);
    console2.log("  spokeRedeem:", spokeRedeem);
    console2.log("  controller :", controllerAA);
  }
}
