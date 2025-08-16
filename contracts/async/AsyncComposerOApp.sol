// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AsyncOps, AsyncCodec} from "./AsyncCodec.sol";
import {OVault4626AsyncRedeem, IAssetOFT} from "../OVault4626AsyncRedeem.sol";

contract AsyncComposerOApp is OApp {
    using AsyncCodec for bytes;

    OVault4626AsyncRedeem public immutable vault;
    IAssetOFT public immutable assetOFT;

    constructor(address endpoint, address _vault, address _assetOFT)
        OApp(endpoint, msg.sender)
        Ownable(msg.sender)
    {
        vault   = OVault4626AsyncRedeem(_vault);
        assetOFT= IAssetOFT(_assetOFT);
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
