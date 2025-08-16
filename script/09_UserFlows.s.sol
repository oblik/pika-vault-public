// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {OVault4626AsyncRedeem} from "../contracts/OVault4626AsyncRedeem.sol";
import {SpokeRedeemOApp} from "../contracts/async/SpokeRedeemOApp.sol";
import {ILayerZeroEndpointV2, MessagingParams, MessagingFee} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { IOFT, SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

// minimal interface to wire OApp peers
interface IOAppPeer { function setPeer(uint32 eid, bytes32 peer) external; }

contract UserFlows is Script {
  using OptionsBuilder for bytes;
  // ----- Base (hub) -----

  function base_setOperator() external {
    uint256 pk = vm.envUint("CONTROLLER_PK");
    address vault   = vm.envAddress("VAULT_BASE");
    address composer= vm.envAddress("ASYNC_COMPOSER_HUB_BASE");

    vm.startBroadcast(pk);
    OVault4626AsyncRedeem(vault).setOperator(composer, true);
    vm.stopBroadcast();

    console2.log("setOperator(controller -> composer) set on Base");
  }

  function base_deposit(uint256 amountAssets) external {
    uint256 pk = vm.envUint("USER_PK");
    address vault = vm.envAddress("VAULT_BASE");
    address usdc  = vm.envAddress("USDC_BASE");
    address receiver = vm.envAddress("CONTROLLER_ADDRESS");

    vm.startBroadcast(pk);
    IERC20(usdc).approve(vault, amountAssets);
    OVault4626AsyncRedeem(vault).deposit(amountAssets, receiver);
    vm.stopBroadcast();

    console2.log("Deposited %s USDC into vault for %s", amountAssets, receiver);
  }

  function base_markClaimable(uint256 shares) external {
    uint256 pk = vm.envUint("CONTROLLER_PK");
    address vault = vm.envAddress("VAULT_BASE");
    address controller = vm.envAddress("CONTROLLER_ADDRESS");

    vm.startBroadcast(pk);
    OVault4626AsyncRedeem(vault).managerMarkClaimable(controller, shares);
    vm.stopBroadcast();

    console2.log("Marked claimable %s shares for controller", shares);
  }

  // ----- Base (hub) send shares to Sepolia (spoke) so the user can burn them -----
  function base_sendSharesToSepolia(uint256 shares, address toSepolia) external {
    uint256 pk = vm.envUint("CONTROLLER_PK");
    address shareAdapter = vm.envAddress("SHARE_ADAPTER_BASE");
    address vault = vm.envAddress("VAULT_BASE"); // underlying share token is the vault ERC20
    uint32 sepoliaEid = uint32(vm.envUint("LZ_EID_SEPOLIA"));

    // Build minimal options and send param
    bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0);
    SendParam memory sp = SendParam(
      sepoliaEid,
      bytes32(uint256(uint160(toSepolia))),
      shares,
      shares,
      extraOptions,
      "",
      ""
    );

    vm.startBroadcast(pk);
    // Approve adapter to lock underlying shares
    IERC20(vault).approve(shareAdapter, shares);

    // Quote + send
    MessagingFee memory fee = IOFT(shareAdapter).quoteSend(sp, false);
    IOFT(shareAdapter).send{value: fee.nativeFee}(sp, fee, payable(msg.sender));
    vm.stopBroadcast();

    console2.log("Sent %s shares from Base to Sepolia for %s", shares, toSepolia);
  }

  // ----- Wire Share OFT peers (Base <-> Sepolia) -----
  function base_setSharePeerToSepolia() external {
    uint256 pk = vm.envUint("DEPLOYER_PK");
    address shareAdapter = vm.envAddress("SHARE_ADAPTER_BASE");
    uint32 sepoliaEid = uint32(vm.envUint("LZ_EID_SEPOLIA"));
    address shareOftSepolia = vm.envAddress("SHARE_OFT_SEPOLIA");

    vm.startBroadcast(pk);
    IOAppPeer(shareAdapter).setPeer(sepoliaEid, bytes32(uint256(uint160(shareOftSepolia))));
    vm.stopBroadcast();

    console2.log("Base share adapter peer set: eid %s -> %s", sepoliaEid, shareOftSepolia);
  }

  function sepolia_setSharePeerToBase() external {
    uint256 pk = vm.envUint("DEPLOYER_PK");
    address shareOftSepolia = vm.envAddress("SHARE_OFT_SEPOLIA");
    uint32 baseEid = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
    address shareAdapter = vm.envAddress("SHARE_ADAPTER_BASE");

    vm.startBroadcast(pk);
    IOAppPeer(shareOftSepolia).setPeer(baseEid, bytes32(uint256(uint160(shareAdapter))));
    vm.stopBroadcast();

    console2.log("Sepolia share OFT peer set: eid %s -> %s", baseEid, shareAdapter);
  }

  // ----- Sepolia (spoke) -----

  // Burn spoke shares and send OP_REQUEST_REDEEM to hub
  function sepolia_requestRedeem(uint256 shares) external {
    uint256 pk = vm.envUint("USER_PK");
    address shareOFT = vm.envAddress("SHARE_OFT_SEPOLIA");
    address spoke    = vm.envAddress("SPOKE_REDEEM_OAPP_SEPOLIA");
    address controller = vm.envAddress("CONTROLLER_ADDRESS");
    // Quote fee from endpoint with minimal executor options
    address lzEndpoint = vm.envAddress("LZ_ENDPOINT_SEPOLIA");
    uint32 hubEid = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
    bytes memory payload = abi.encodePacked(bytes1(uint8(0xA1)), bytes("dummy"));
    bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0);
    MessagingFee memory fee = ILayerZeroEndpointV2(lzEndpoint).quote(
      MessagingParams({
        dstEid: hubEid,
        receiver: bytes32(uint256(uint160(vm.envAddress("ASYNC_COMPOSER_HUB_BASE")))) ,
        message: payload,
        options: options,
        payInLzToken: false
      }),
      spoke
    );
    uint256 lzFeeWei = fee.nativeFee;

    vm.startBroadcast(pk);
    IERC20(shareOFT).approve(spoke, shares);
    SpokeRedeemOApp(spoke).requestRedeemOnSpoke{value: lzFeeWei}(controller, shares);
    vm.stopBroadcast();

    console2.log("Requested async redeem of %s shares on Sepolia", shares);
  }

  // Ask hub to claim and bridge underlying via CCTP Fast
  function sepolia_claimUsdcFast(uint256 shares, uint256 minAssets) external {
    uint256 pk = vm.envUint("USER_PK");
    address spoke = vm.envAddress("SPOKE_REDEEM_OAPP_SEPOLIA");
    address controller = vm.envAddress("CONTROLLER_ADDRESS");

    uint32 destDomain = uint32(vm.envUint("CCTP_DOMAIN_DEST"));
    address mintRecipient = vm.envAddress("DEST_TREASURY");
    uint256 maxFee = vm.envUint("CCTP_MAX_FEE");
    uint32 minFinality = uint32(vm.envUint("CCTP_MIN_FINALITY"));
    // Quote fee from endpoint for this message size
    address lzEndpoint = vm.envAddress("LZ_ENDPOINT_SEPOLIA");
    uint32 hubEid = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
    // approximate payload size with the same enc as production (shares etc.) only affects size
    bytes memory payload = abi.encodePacked(bytes1(uint8(0xA3)), bytes(new bytes(128)));
    bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(300_000, 0);
    MessagingFee memory fee = ILayerZeroEndpointV2(lzEndpoint).quote(
      MessagingParams({
        dstEid: hubEid,
        receiver: bytes32(uint256(uint160(vm.envAddress("ASYNC_COMPOSER_HUB_BASE")))) ,
        message: payload,
        options: options,
        payInLzToken: false
      }),
      spoke
    );
    uint256 lzFeeWei = fee.nativeFee;

    vm.startBroadcast(pk);
    SpokeRedeemOApp(spoke).claimSendUsdcFast{value: lzFeeWei}(
      controller,
      mintRecipient,
      shares,
      destDomain,
      maxFee,
      minFinality,
      address(0),
      hex"",
      minAssets
    );
    vm.stopBroadcast();

    console2.log("Claimed %s shares via CCTP Fast to %s (domain %s)", shares, mintRecipient, destDomain);
  }

  // Deposit via CCTP Fast from Sepolia to Base (mint on Base, deposit, route shares via OFT per hookData)
  function sepolia_depositUsdcFast(uint256 amountAssets, uint32 destDomain, address depositReceiver) external {
    uint256 pk = vm.envUint("USER_PK");
    address spoke = vm.envAddress("SPOKE_REDEEM_OAPP_SEPOLIA");
    uint256 maxFee = vm.envUint("CCTP_MAX_FEE");
    uint32 minFinality = uint32(vm.envUint("CCTP_MIN_FINALITY"));
    // Quote fee from endpoint
    address lzEndpoint = vm.envAddress("LZ_ENDPOINT_SEPOLIA");
    uint32 hubEid = uint32(vm.envUint("LZ_EID_BASE_SEPOLIA"));
    bytes memory payload = abi.encodePacked(bytes1(uint8(0xA4)), bytes(new bytes(96)));
    bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0);
    MessagingFee memory fee = ILayerZeroEndpointV2(lzEndpoint).quote(
      MessagingParams({
        dstEid: hubEid,
        receiver: bytes32(uint256(uint160(vm.envAddress("ASYNC_COMPOSER_HUB_BASE")))) ,
        message: payload,
        options: options,
        payInLzToken: false
      }),
      spoke
    );
    uint256 lzFeeWei = fee.nativeFee;

    vm.startBroadcast(pk);
    SpokeRedeemOApp(spoke).depositUsdcFast{value: lzFeeWei}(
      amountAssets,
      destDomain,
      depositReceiver,
      maxFee,
      minFinality,
      address(0),
      hex""
    );
    vm.stopBroadcast();

    console2.log("Deposited %s USDC via CCTP Fast to depositReceiver %s (domain %s)", amountAssets, depositReceiver, destDomain);
  }
}


