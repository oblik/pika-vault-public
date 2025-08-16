// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {OVault4626AsyncRedeem} from "../contracts/OVault4626AsyncRedeem.sol";
import {SpokeRedeemOApp} from "../contracts/async/SpokeRedeemOApp.sol";

contract UserFlows is Script {
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

  // ----- Sepolia (spoke) -----

  // Burn spoke shares and send OP_REQUEST_REDEEM to hub
  function sepolia_requestRedeem(uint256 shares) external {
    uint256 pk = vm.envUint("USER_PK");
    address shareOFT = vm.envAddress("SHARE_OFT_SEPOLIA");
    address spoke    = vm.envAddress("SPOKE_REDEEM_OAPP_SEPOLIA");
    address controller = vm.envAddress("CONTROLLER_ADDRESS");
    uint256 lzFeeWei = vm.envUint("LZ_FEE_WEI");

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
    uint256 lzFeeWei = vm.envUint("LZ_FEE_WEI");

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
    uint256 lzFeeWei = vm.envUint("LZ_FEE_WEI");

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


