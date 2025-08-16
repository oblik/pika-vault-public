// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function approve(address spender, uint256 value) external returns (bool);
}

interface ITokenMessengerV2 {
    function depositForBurnWithHook(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,        // EVM addr left-padded to 32 bytes
        address burnToken,            // USDC on source chain
        bytes32 destinationCaller,    // optional hook executor (can be zero)
        uint256 maxFee,               // fast transfer fee ceiling
        uint32  minFinalityThreshold, // e.g. 2000 (standard) / 1000 (fast)
        bytes calldata hookData       // optional metadata for hooks
    ) external returns (bytes32 messageHash);
}

library AddrCast {
    function toBytes32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }
}

contract CctpBridger {
    using AddrCast for address;

    ITokenMessengerV2 public immutable messenger;
    address public immutable usdc;

    constructor(address _messenger, address _usdc) {
        messenger = ITokenMessengerV2(_messenger);
        usdc = _usdc;
    }

    /// @notice Approve and initiate CCTP v2 burn+mint to dest domain/treasury.
    function bridgeUSDCV2(
        uint256 amount,
        uint32  destDomain,
        address destMintRecipient,
        address destCaller,           // can be address(0)
        uint256 maxFee,               // set 0 for standard (no fast fee)
        uint32  minFinalityThreshold, // 2000 standard, 1000 fast
        bytes calldata hookData
    ) external returns (bytes32) {
        // NOTE: This contract must hold USDC or the messenger implementation must pull from msg.sender.
        IERC20(usdc).approve(address(messenger), amount);
        return messenger.depositForBurnWithHook(
            amount,
            destDomain,
            destMintRecipient.toBytes32(),
            usdc,
            destCaller.toBytes32(),
            maxFee,
            minFinalityThreshold,
            hookData
        );
    }
}
