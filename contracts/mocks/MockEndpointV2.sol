// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockEndpointV2 {
    address public delegate;
    function setDelegate(address _delegate) external {
        delegate = _delegate;
    }
}
