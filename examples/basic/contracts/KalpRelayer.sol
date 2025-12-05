// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract KalpRelayer is ReentrancyGuard, EIP712, Ownable, ERC2771Context {
    bytes32 private constant RELAY_REQUEST_TYPEHASH =
        keccak256(
            "RelayRequest(address target,bytes data,address user,address sponsor,uint256 chainId)"
        );

    mapping(address => bool) public authorizedRelayers;

    event RelayExecuted(
        address indexed target,
        address indexed user,
        address indexed sponsor,
        bool success,
        bytes result
    );

    constructor(address trustedForwarder)
        EIP712("KalpRelayer", "1.0.0")
        Ownable(msg.sender)
        ERC2771Context(trustedForwarder)
    {}

    function addAuthorizedRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = true;
    }

    function removeAuthorizedRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
    }

    function executeRelay(
        address target,
        bytes calldata data,
        address user,
        bytes calldata userSignature,
        address sponsor
    ) external nonReentrant returns (bool, bytes memory) {
        require(authorizedRelayers[_msgSender()], "Unauthorized relayer");
        require(block.chainid == _chainId(), "Invalid chain ID");

        bytes32 structHash = keccak256(
            abi.encode(
                RELAY_REQUEST_TYPEHASH,
                target,
                keccak256(data),
                user,
                sponsor,
                _chainId()
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, userSignature);
        require(signer == user, "Invalid signature");

        (bool success, bytes memory result) = target.call(data);

        emit RelayExecuted(target, user, sponsor, success, result);

        return (success, result);
    }

    // Resolve the conflict by explicitly overriding and delegating to ERC2771Context
    function _contextSuffixLength() internal view virtual override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }

    function _msgSender() internal view virtual override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view virtual override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _chainId() internal view returns (uint256) {
        return block.chainid;
    }
}