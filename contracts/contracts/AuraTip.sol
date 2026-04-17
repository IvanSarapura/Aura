// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Stateless multi-token tip contract.
/// Accepts any ERC-20; the frontend enforces the curated token whitelist.
/// No constructor args, no owner, no escrow, no fees.
contract AuraTip {
    event TipSent(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        string  category,
        string  message
    );

    function tip(
        address recipient,
        uint256 amount,
        address token,
        string calldata category,
        string calldata message
    ) external {
        require(recipient != address(0), "AuraTip: zero recipient");
        require(amount    >  0,          "AuraTip: zero amount");
        require(token     != address(0), "AuraTip: zero token");
        require(
            IERC20(token).transferFrom(msg.sender, recipient, amount),
            "AuraTip: transfer failed"
        );
        emit TipSent(msg.sender, recipient, token, amount, category, message);
    }
}
