// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title GachaGame
 * @dev A simple "gacha" betting contract using Chainlink VRF for randomness.
 */
contract GachaGame is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;

    // VRF parameters
    uint64  public s_subscriptionId;
    bytes32 public keyHash;
    uint16  public requestConfirmations = 3;
    uint32  public callbackGasLimit     = 200_000;
    uint32  public constant NUM_RANDOM_WORDS = 1;

    struct BetInfo {
        address player;
        uint256 amount;
        uint256 multiplier;
        bool    resolved;
        bool    won;
        uint256 payout;
    }

    mapping(uint256 => BetInfo) public bets;
    uint256[] public allRequestIds;

    event BetPlaced(
        uint256 indexed requestId,
        address indexed player,
        uint256 amount,
        uint256 multiplier
    );
    event BetResolved(
        uint256 indexed requestId,
        address indexed player,
        bool won,
        uint256 payout
    );

    constructor(
        address _vrfCoordinator,
        uint64  _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR      = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_subscriptionId = _subscriptionId;
        keyHash          = _keyHash;
    }

    receive() external payable {}
    fallback() external payable {}

    /**
     * @notice Place a new gacha bet. Must send ETH equal to `msg.value`. Choose a multiplier between 2 and 10.
     * @param multiplier  The multiplier you’d like (e.g. 2 for "2× your bet if you win").
     * @return requestId  The Chainlink VRF request ID.
     */
    function placeBet(uint256 multiplier) external payable returns (uint256 requestId) {
        require(multiplier >= 2 && multiplier <= 10, "Multiplier must be 2..10");
        require(msg.value > 0, "Must send ETH to bet");

        // cfScaled = (0.06 * 1e18) / (multiplier^2) = 6e34 / (multiplier^2)
        uint256 cfScaled = (6 * 10**16 * 10**18) / (multiplier * multiplier);

        require(address(this).balance >= msg.value * multiplier, "House cannot cover this payout");

        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            NUM_RANDOM_WORDS
        );

        bets[requestId] = BetInfo({
            player:     msg.sender,
            amount:     msg.value,
            multiplier: multiplier,
            resolved:   false,
            won:        false,
            payout:     0
        });
        allRequestIds.push(requestId);

        emit BetPlaced(requestId, msg.sender, msg.value, multiplier);
    }

    /**
     * @notice This function is automatically called by the VRF Coordinator (mock or real).
     * @param requestId    The request ID returned by requestRandomWords()
     * @param randomWords  The array of random words (we only asked for 1). We use randomWords[0].
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        BetInfo storage b = bets[requestId];
        require(!b.resolved, "Already resolved");
        require(b.amount > 0, "Bet not found");

        b.resolved = true;
        uint256 rand = randomWords[0] % 10**18;
        uint256 cfScaled = (6 * 10**16 * 10**18) / (b.multiplier * b.multiplier);

        bool won = (rand < cfScaled);
        b.won = won;

        if (won) {
            uint256 payoutAmt = b.amount * b.multiplier;
            b.payout = payoutAmt;
            (bool sent, ) = b.player.call{value: payoutAmt}("");
            require(sent, "Failed to send payout");
        } else {
            b.payout = 0;
        }

        emit BetResolved(requestId, b.player, won, b.payout);
    }

    /**
     * @notice Get basic info for a given request ID.
     * @param requestId  The VRF request ID
     * @return player The address of the player
     * @return amount The amount bet in wei
     * @return multiplier The chosen multiplier
     * @return resolved Whether the bet has been resolved
     * @return won Whether the player won
     * @return payout The payout in wei
     */
    function getBetInfo(uint256 requestId)
        external
        view
        returns (
            address player,
            uint256 amount,
            uint256 multiplier,
            bool    resolved,
            bool    won,
            uint256 payout
        )
    {
        BetInfo memory b = bets[requestId];
        return (b.player, b.amount, b.multiplier, b.resolved, b.won, b.payout);
    }
}
