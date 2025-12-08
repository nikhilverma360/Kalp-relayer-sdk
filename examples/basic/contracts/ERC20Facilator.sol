// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// ERC20 token interface with permit functionality (EIP-2612)
interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function nonces(address owner) external view returns (uint256);
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

/**
 * @title ERC20Facilitator
 * @dev Allows users to transfer any ERC20 token without sending an on-chain approval transaction
 * using ERC20 permit pattern (EIP-2612)
 * Includes bulk transfer functionality for multiple recipients
 */
contract ERC20Facilitator is 
    Ownable, 
    ReentrancyGuard 
{
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Struct for bulk transfer recipients
    struct Recipient {
        address to;
        uint256 amount;
    }

    // Mapping to track used permit signatures to prevent replay attacks
    // token => permitHash => used
    mapping(address => mapping(bytes32 => bool)) public usedPermits;

    // Events
    event FacilitationExecuted(
        address indexed token,
        address indexed owner,
        address indexed to,
        uint256 amount
    );
    
    event BulkFacilitationExecuted(
        address indexed token,
        address indexed owner,
        uint256 recipientCount,
        uint256 totalAmount
    );

    // Custom errors
    error InvalidPermitSignature();
    error PermitAlreadyUsed();
    error PermitExpired();
    error InsufficientBalance();
    error InvalidRecipient();
    error ZeroAmount();
    error EmptyRecipientList();
    error InvalidRecipientAmount();
    error InvalidToken();
    error AmountMismatch();

    /**
     * @dev Constructor - initializes the contract
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Main function to facilitate ERC20 transfer using permit
     * @param token Address of the ERC20 token contract
     * @param owner Address of the token owner
     * @param to Recipient address for the token transfer
     * @param value Amount of tokens to be transferred
     * @param deadline Permit signature deadline
     * @param v Recovery byte of the signature
     * @param r First 32 bytes of the signature
     * @param s Second 32 bytes of the signature
     */
    function facilitateTransferWithPermit(
        address token,
        address owner,
        address to,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // Input validation
        if (token == address(0)) revert InvalidToken();
        if (owner == address(0) || to == address(0)) revert InvalidRecipient();
        if (value == 0) revert ZeroAmount();
        if (block.timestamp > deadline) revert PermitExpired();

        // Create permit hash to prevent replay attacks
        bytes32 permitHash = keccak256(abi.encodePacked(
            token,
            owner,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        ));
        
        if (usedPermits[token][permitHash]) revert PermitAlreadyUsed();
        usedPermits[token][permitHash] = true;

        // Check owner's balance
        if (IERC20Permit(token).balanceOf(owner) < value) revert InsufficientBalance();

        // Execute permit to approve this contract to spend tokens
        try IERC20Permit(token).permit(owner, address(this), value, deadline, v, r, s) {
            // Permit successful
        } catch {
            revert InvalidPermitSignature();
        }

        // Transfer tokens to recipient
        IERC20Permit(token).transferFrom(owner, to, value);

        // Emit event
        emit FacilitationExecuted(token, owner, to, value);
    }

    /**
     * @dev Bulk transfer function to send tokens to multiple recipients using permit
     * @param token Address of the ERC20 token contract
     * @param owner Address of the token owner
     * @param recipients Array of recipients with their respective amounts
     * @param totalValue Total amount of tokens to be transferred
     * @param deadline Permit signature deadline
     * @param v Recovery byte of the signature
     * @param r First 32 bytes of the signature
     * @param s Second 32 bytes of the signature
     */
    function facilitateBulkTransferWithPermit(
        address token,
        address owner,
        Recipient[] calldata recipients,
        uint256 totalValue,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // Input validation
        if (token == address(0)) revert InvalidToken();
        if (owner == address(0)) revert InvalidRecipient();
        if (recipients.length == 0) revert EmptyRecipientList();
        if (totalValue == 0) revert ZeroAmount();
        if (block.timestamp > deadline) revert PermitExpired();

        // Calculate total amount needed for recipients
        uint256 totalRecipientAmount = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i].to == address(0)) revert InvalidRecipient();
            if (recipients[i].amount == 0) revert InvalidRecipientAmount();
            totalRecipientAmount += recipients[i].amount;
        }

        // Verify that totalValue equals total recipient amounts
        if (totalValue != totalRecipientAmount) revert AmountMismatch();

        // Create permit hash to prevent replay attacks
        bytes32 permitHash = keccak256(abi.encodePacked(
            token,
            owner,
            address(this),
            totalValue,
            deadline,
            recipients.length,
            v,
            r,
            s
        ));
        
        if (usedPermits[token][permitHash]) revert PermitAlreadyUsed();
        usedPermits[token][permitHash] = true;

        // Check owner's balance
        if (IERC20Permit(token).balanceOf(owner) < totalValue) revert InsufficientBalance();

        // Execute permit to approve this contract to spend tokens
        try IERC20Permit(token).permit(owner, address(this), totalValue, deadline, v, r, s) {
            // Permit successful
        } catch {
            revert InvalidPermitSignature();
        }

        // Transfer to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20Permit(token).transferFrom(owner, recipients[i].to, recipients[i].amount);
        }

        // Emit event
        emit BulkFacilitationExecuted(token, owner, recipients.length, totalRecipientAmount);
    }

    /**
     * @dev Alternative function with nonce tracking for additional security
     * @param token Address of the ERC20 token contract
     * @param owner Address of the token owner
     * @param to Recipient address for the token transfer
     * @param value Amount of tokens to be transferred
     * @param deadline Permit signature deadline
     * @param v Recovery byte of the signature
     * @param r First 32 bytes of the signature
     * @param s Second 32 bytes of the signature
     */
    function facilitateTransferWithNonceTracking(
        address token,
        address owner,
        address to,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // Input validation
        if (token == address(0)) revert InvalidToken();
        if (owner == address(0) || to == address(0)) revert InvalidRecipient();
        if (value == 0) revert ZeroAmount();
        if (block.timestamp > deadline) revert PermitExpired();

        // Get current nonce for additional replay protection
        uint256 nonce = IERC20Permit(token).nonces(owner);
        
        // Create permit hash to prevent replay attacks
        bytes32 permitHash = keccak256(abi.encodePacked(
            token,
            owner,
            address(this),
            value,
            deadline,
            nonce,
            v,
            r,
            s
        ));
        
        if (usedPermits[token][permitHash]) revert PermitAlreadyUsed();
        usedPermits[token][permitHash] = true;

        // Check owner's balance
        if (IERC20Permit(token).balanceOf(owner) < value) revert InsufficientBalance();

        // Execute permit to approve this contract to spend tokens
        try IERC20Permit(token).permit(owner, address(this), value, deadline, v, r, s) {
            // Permit successful
        } catch {
            revert InvalidPermitSignature();
        }

        // Transfer tokens to recipient
        IERC20Permit(token).transferFrom(owner, to, value);

        // Emit event
        emit FacilitationExecuted(token, owner, to, value);
    }

    /**
     * @dev Bulk transfer function with nonce tracking
     * @param token Address of the ERC20 token contract
     * @param owner Address of the token owner
     * @param recipients Array of recipients with their respective amounts
     * @param totalValue Total amount of tokens to be transferred
     * @param deadline Permit signature deadline
     * @param v Recovery byte of the signature
     * @param r First 32 bytes of the signature
     * @param s Second 32 bytes of the signature
     */
    function facilitateBulkTransferWithNonceTracking(
        address token,
        address owner,
        Recipient[] calldata recipients,
        uint256 totalValue,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // Input validation
        if (token == address(0)) revert InvalidToken();
        if (owner == address(0)) revert InvalidRecipient();
        if (recipients.length == 0) revert EmptyRecipientList();
        if (totalValue == 0) revert ZeroAmount();
        if (block.timestamp > deadline) revert PermitExpired();

        // Validate recipients and calculate total
        uint256 totalRecipientAmount = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i].to == address(0)) revert InvalidRecipient();
            if (recipients[i].amount == 0) revert InvalidRecipientAmount();
            totalRecipientAmount += recipients[i].amount;
        }
        
        // Verify that totalValue equals total recipient amounts
        if (totalValue != totalRecipientAmount) revert AmountMismatch();

        // Get current nonce for additional replay protection
        uint256 nonce = IERC20Permit(token).nonces(owner);
        
        // Create permit hash to prevent replay attacks
        bytes32 permitHash = keccak256(abi.encodePacked(
            token,
            owner,
            address(this),
            totalValue,
            deadline,
            nonce,
            recipients.length // Use recipient count instead of full array hash
        ));
        
        if (usedPermits[token][permitHash]) revert PermitAlreadyUsed();
        usedPermits[token][permitHash] = true;

        // Check owner's balance
        if (IERC20Permit(token).balanceOf(owner) < totalValue) revert InsufficientBalance();

        // Execute permit to approve this contract to spend tokens
        try IERC20Permit(token).permit(owner, address(this), totalValue, deadline, v, r, s) {
            // Permit successful
        } catch {
            revert InvalidPermitSignature();
        }

        // Transfer to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20Permit(token).transferFrom(owner, recipients[i].to, recipients[i].amount);
        }

        // Emit event
        emit BulkFacilitationExecuted(token, owner, recipients.length, totalRecipientAmount);
    }

    /**
     * @dev Get token decimals for calculations
     * @param token Address of the ERC20 token
     * @return Number of decimals
     */
    function getTokenDecimals(address token) external view returns (uint8) {
        return IERC20Permit(token).decimals();
    }

    /**
     * @dev Check if a permit signature has been used for a specific token
     * @param token Address of the ERC20 token
     * @param permitHash Hash of the permit parameters
     * @return Boolean indicating if the permit has been used
     */
    function isPermitUsed(address token, bytes32 permitHash) external view returns (bool) {
        return usedPermits[token][permitHash];
    }

    /**
     * @dev Calculate permit hash for replay attack prevention (single transfer)
     * @param token Token contract address
     * @param owner Token owner address
     * @param value Amount to permit
     * @param deadline Permit deadline
     * @param v Signature parameter
     * @param r Signature parameter
     * @param s Signature parameter
     * @return Hash of the permit parameters
     */
    function calculatePermitHash(
        address token,
        address owner,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external view returns (bytes32) {
        return keccak256(abi.encodePacked(
            token,
            owner,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        ));
    }

    /**
     * @dev Calculate permit hash for bulk transfers
     * @param token Token contract address
     * @param owner Token owner address
     * @param totalValue Total amount to permit
     * @param deadline Permit deadline
     * @param recipientCount Number of recipients
     * @return Hash of the bulk permit parameters
     */
    function calculateBulkPermitHash(
        address token,
        address owner,
        uint256 totalValue,
        uint256 deadline,
        uint256 recipientCount
    ) external view returns (bytes32) {
        return keccak256(abi.encodePacked(
            token,
            owner,
            address(this),
            totalValue,
            deadline,
            recipientCount
        ));
    }

    /**
     * @dev Calculate total amount needed for a list of recipients
     * @param recipients Array of recipients with amounts
     * @return Total amount needed for all recipients
     */
    function calculateTotalRecipientAmount(Recipient[] calldata recipients) external pure returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            total += recipients[i].amount;
        }
        return total;
    }

    /**
     * @dev Check if a token supports the permit functionality
     * @param token Token address to check
     * @return Boolean indicating if the token supports permit
     */
    function supportsPermit(address token) external view returns (bool) {
        try IERC20Permit(token).DOMAIN_SEPARATOR() returns (bytes32) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev Emergency function to rescue tokens (only owner)
     * @param token Token address to rescue
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert InvalidRecipient();
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @dev Get contract version
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}