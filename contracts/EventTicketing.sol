// SPDX-License-Identifier: MIT


pragma solidity ^0.8.34;


contract EventTicketing {

    struct Event {
        uint256 id;
        address organizer;
        uint256 price;
        uint256 supply;
        uint256 sold;
    }

    uint256 public nextEventId;

    mapping (uint256 => Event) public events;

    event EventCreated(uint256 indexed eventId, address indexed organizer, uint256 price, uint256 supply);

    
    function createEvent(uint256 price, uint256 supply) external {
        require(supply > 0, "Supply must be greater than 0");
        uint256 eventId = nextEventId;

        events[eventId] = Event(
            {
                id: eventId,
                organizer: msg.sender,
                price: price,
                supply: supply,
                sold: 0
            }
        );

        emit EventCreated(eventId, msg.sender, price, supply);

        nextEventId++;

    }

}