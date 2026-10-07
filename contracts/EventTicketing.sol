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
    event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed owner);
    event TicketTransferred(uint256 indexed ticketId, address indexed previousOwner, address indexed newOwner);
    event TicketUsed(uint256 indexed ticketId, uint256 indexed eventId);



    
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
        require(eventId < nextEventId, "Event does not exist");

        Event storage eventData = events[eventId];

        require(eventData.sold < eventData.supply, "Event is sold out");
        require(msg.value == eventData.price, "Incorrect ticket price");

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

        emit TicketPurchased(ticketId, eventId, msg.sender);

        (bool success, ) = payable(eventData.organizer).call{value: msg.value}("");

        require(success, "Payment failed");

    }


    function transferTicket(uint256 ticketId, address newOwner) external {
        require(ticketId < nextTicketId, "Ticket doesn't exist");

        Ticket storage ticket = tickets[ticketId];

        require(ticket.owner == msg.sender, "Not the ticket owner");
        require(!ticket.isUsed, "Ticket already used");
        require(newOwner != address(0), "Invalid new owner");

        address previousOwner = ticket.owner;

        ticket.owner = newOwner;

        emit TicketTransferred(ticketId, previousOwner, newOwner);

    }
    

    function verifyTicket(uint256 ticketId) external view returns (uint256 eventId, address owner, bool isUsed) {
        require(ticketId < nextTicketId, "Tickets doesn't exist");

        Ticket storage ticket = tickets[ticketId];

        return(ticket.eventId, ticket.owner, ticket.isUsed);

    }


    function useTicket(uint256 ticketId) external {
        require(ticketId < nextTicketId, "Ticket does not exist");

        Ticket storage ticket = tickets[ticketId];
        Event storage eventData = events[ticket.eventId];

        if (msg.sender != eventData.organizer) {
            revert("Only organizer can use ticket");
        }

        require(!ticket.isUsed, "Ticket already used");

        ticket.isUsed = true;

        emit TicketUsed(ticketId, ticket.eventId);
    }

}