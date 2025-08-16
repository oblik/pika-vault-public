// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// CCIP v0.8 receiver (install the CCIP lib and set remappings below)
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract NavReceiver is CCIPReceiver {
    uint256 public lastNAV;
    event NAVUpdated(uint256 nav, bytes32 messageId);

    constructor(address router) CCIPReceiver(router) {}

    function _ccipReceive(Client.Any2EVMMessage memory m) internal override {
        (uint256 nav) = abi.decode(m.data, (uint256));
        lastNAV = nav;
        emit NAVUpdated(nav, m.messageId);
        // optional: call into your vault/strategy here
    }
}
