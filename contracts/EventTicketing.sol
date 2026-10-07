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


    struct Ticket {
        uint256 id;
        uint256 eventId;
        address owner;
        bool isUsed;
    }


    uint256 public nextEventId;
    uint256 public nextTicketId;

    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;

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


    function buyTicket(uint256 eventId) external payable {
        Event storage eventData = events[eventId];

        require(eventId < nextEventId, "Event doesn't exist");
        require(eventData.sold < eventData.supply, "Event is sold out");
        require(msg.value == eventData.price, "Incorrect event price");
        
        uint256 ticketId = nextTicketId;

        tickets[ticketId] = Ticket(
            {
                id: ticketId,
                eventId: eventId,
                owner: msg.sender,
                isUsed: false
            }
        );

        eventData.sold++;
        nextTicketId++;

    }


    function transferTicket(uint256 ticketId, address newOwner) external {
        require(ticketId < nextTicketId, "Ticket doesn't exist");

        Ticket storage ticket = tickets[ticketId];

        require(ticket.owner == msg.sender, "Not the ticket owner");
        require(!ticket.isUsed, "Ticket already used");
        require(newOwner != address(0), "Invalid new owner");

        ticket.owner = newOwner;

    }

}