// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OVault4626AsyncRedeem, IAssetOFT} from "../OVault4626AsyncRedeem.sol";

interface IShareOFT is IAssetOFT {}

contract CctpDepositReceiver is Ownable {
    OVault4626AsyncRedeem public immutable vault;      // hub vault
    IShareOFT public immutable shareOFT;               // hub share OFT adapter (lockbox)

    event Deposited(uint256 assets, uint256 shares);
    event SharesSent(uint32 dstEid, address receiver, uint256 shares);
    event SharesTransferred(address receiver, uint256 shares);

    constructor(address _vault, address _shareOFT, address _owner) Ownable(_owner) {
        vault = OVault4626AsyncRedeem(_vault);
        shareOFT = IShareOFT(_shareOFT);
    }

    function _toB32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }

    // hookData encoding suggestion: abi.encode(receiver, shareDstEid, minShares, oftOptions)
    function finalizeDeposit(bytes calldata hookData) external {
        (address receiver, uint32 shareDstEid, uint256 minShares, bytes memory oftOptions) =
            abi.decode(hookData, (address, uint32, uint256, bytes));

        IERC20 assetToken = IERC20(vault.asset());
        uint256 assets = assetToken.balanceOf(address(this));
        require(assets > 0, "no USDC");

        // approve and deposit into vault
        require(assetToken.approve(address(vault), assets), "approve fail");
        uint256 shares = vault.deposit(assets, address(this));
        require(shares >= minShares, "minShares");
        emit Deposited(assets, shares);

        if (shareDstEid == 0) {
            // local deliver
            require(IERC20(address(vault)).transfer(receiver, shares), "share transfer fail");
            emit SharesTransferred(receiver, shares);
        } else {
            // cross-chain deliver shares via OFT
            require(IERC20(address(vault)).approve(address(shareOFT), shares), "approve share fail");
            shareOFT.send(shareDstEid, _toB32(receiver), shares, oftOptions);
            emit SharesSent(shareDstEid, receiver, shares);
        }
    }
}
