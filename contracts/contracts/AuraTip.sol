// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Stateless tip contract — transfers USDm from sender to recipient in one call.
/// No escrow, no fees, no admin keys. The sender must approve this contract first.
contract AuraTip {
    IERC20 public immutable usdm;

    event TipSent(
        address indexed from,
        address indexed to,
        uint256 amount,
        string  category,
        string  message
    );

    constructor(address _usdm) {
        require(_usdm != address(0), "AuraTip: zero usdm");
        usdm = IERC20(_usdm);
    }

    function tip(
        address recipient,
        uint256 amount,
        string calldata category,
        string calldata message
    ) external {
        require(recipient != address(0), "AuraTip: zero recipient");
        require(amount > 0,             "AuraTip: zero amount");
        require(
            usdm.transferFrom(msg.sender, recipient, amount),
            "AuraTip: transfer failed"
        );
        emit TipSent(msg.sender, recipient, amount, category, message);
    }
}
