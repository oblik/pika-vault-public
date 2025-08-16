// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {AsyncOps, AsyncCodec} from "./AsyncCodec.sol";
import {OVault4626AsyncRedeem, IAssetOFT} from "../OVault4626AsyncRedeem.sol";
import {CctpBridger} from "../bridge/CctpBridger.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AsyncComposerOApp is OApp {
    using AsyncCodec for bytes;

    OVault4626AsyncRedeem public immutable vault;
    IAssetOFT public immutable assetOFT;
    CctpBridger public immutable cctpBridger;

    constructor(address endpoint, address _vault, address _assetOFT, address _cctpBridger)
        OApp(endpoint, msg.sender) Ownable(msg.sender)
    {
        vault        = OVault4626AsyncRedeem(_vault);
        assetOFT     = IAssetOFT(_assetOFT);
        cctpBridger  = CctpBridger(_cctpBridger);
    }

    // LZ receive
    function _lzReceive(Origin calldata /*origin*/, bytes32 /*guid*/, bytes calldata payload, address /*executor*/, bytes calldata /*extraData*/) internal override {
        uint8 op = uint8(payload[0]);
        bytes memory data = payload[1:];

        if (op == AsyncOps.OP_REQUEST_REDEEM) {
            (address controller, address owner, uint256 shares) = AsyncCodec.decRequest(data);
            // caller is trusted OApp; vault pulls 'owner' shares from this composer, so we need allowance
            vault.requestRedeem(shares, controller, owner);
        } else if (op == AsyncOps.OP_CLAIM_SEND_ASSETS) {
            (address controller, address receiver, uint256 shares, uint32 dstEid, uint256 minAssets, bytes memory options)
                = AsyncCodec.decClaim(data);
            // composer acts as operator; pre-approve in setup
            vault.claimRedeemToChain(shares, receiver, controller, dstEid, minAssets, options, assetOFT);
        } else if (op == AsyncOps.OP_CLAIM_SEND_USDC_CCTP) {
            (
                address controller,
                address mintRecipient,
                uint256 shares,
                uint32  destDomain,
                uint256 maxFee,
                uint32  minFinality,
                address destCaller,
                bytes memory hookData,
                uint256 minAssets
            ) = AsyncCodec.decClaimCCTP(data);
            uint256 assets = vault.claimRedeem(shares, address(cctpBridger), controller);
            require(assets >= minAssets, "minAssets");
            cctpBridger.bridgeUSDCV2(assets, destDomain, mintRecipient, destCaller, maxFee, minFinality, hookData);
        } else if (op == AsyncOps.OP_DEPOSIT_USDC_CCTP) {
            (
                address sender,
                uint256 amountAssets,
                uint32  destDomain,
                address depositReceiver,
                uint256 maxFee,
                uint32  minFinality,
                address destCaller,
                bytes memory hookData
            ) = AsyncCodec.decDepositCCTP(data);
            // USDC must be held by this contract or bridger. For demo, expect the bridger to pull from itself (approve beforehand if needed)
            // Here we just initiate the burn/mint to the DepositReceiver, which will deposit and distribute shares.
            cctpBridger.bridgeUSDCV2(amountAssets, destDomain, depositReceiver, destCaller, maxFee, minFinality, hookData);
        } else {
            revert("AsyncComposer: bad op");
        }
    }

    // convenience: allow the controller to whitelist this composer as operator in the vault
    function setAsOperatorFor(address controller, bool approved) external {
        require(msg.sender == controller, "only controller");
        vault.setOperator(address(this), approved);
    }
}
