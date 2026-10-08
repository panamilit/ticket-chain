<p align="center"><img src="https://i.ibb.co/84xcnqGN/object-main.webp"></p>


# TicketChain

**A blockchain-based event ticketing prototype built on Ethereum.**

TicketChain is a decentralised event ticketing application that demonstrates how Ethereum smart contracts can be used to manage event creation, ticket purchases, ownership transfers, verification, and redemption.

The application combines on-chain ticket management with off-chain event metadata storage. Users interact with the Ethereum Sepolia test network through MetaMask, while a lightweight FastAPI backend stores additional event information.

This project was developed as part of a university Blockchain & Cryptocurrency group project.

## Features

- **Event Creation:** Organisers can create events by specifying ticket prices and supply, alongside event details such as name, venue, and date.
- **Event Discovery:** Browse available events and view ticket prices, availability, and organiser information.
- **Ticket Purchasing:** Purchase tickets using Sepolia ETH through MetaMask.
- **Ticket Ownership:** View tickets associated with the connected Ethereum wallet.
- **Ticket Transfers:** Transfer unused tickets between Ethereum addresses.
- **Ticket Verification:** Verify a ticket's event, current owner, and redemption status directly from the blockchain.
- **Ticket Redemption:** Event organisers can mark tickets as used, preventing repeated redemption or further transfers.

## Technology Stack

| Layer | Technologies |
|---|---|
| Blockchain | Ethereum Sepolia, Solidity |
| Smart Contract Development | Remix IDE |
| Wallet Integration | MetaMask |
| Blockchain Interaction | Ethers.js v6 |
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| API | REST |

## Architecture

TicketChain follows a hybrid architecture that separates blockchain operations from event metadata storage.

```text
                   User
                    |
                    v
          +-------------------+
          |   Web Frontend    |
          | HTML / CSS / JS   |
          +-------------------+
             |             |
             |             |
             v             v
       MetaMask         FastAPI
             |             |
             v             v
         Ethers.js       SQLite
             |
             v
      Ethereum Sepolia
             |
             v
      EventTicketing.sol
```

### On-Chain Data

The Ethereum smart contract is responsible for:

- Event identifiers, organisers, ticket prices, and supply.
- Ticket creation and ownership.
- Ticket transfers between wallets.
- Ticket verification and redemption status.
- Processing ticket payments to event organisers.

### Off-Chain Data

The FastAPI backend stores descriptive event metadata:

- Event name
- Description
- Venue
- Date
- Associated smart contract event ID

Each database record references its corresponding on-chain event using `contract_event_id`.

Ticket ownership and redemption status are maintained by the smart contract rather than the database.

## Smart Contract

The core contract is located at:

`contracts/EventTicketing.sol`

### Main Functions

| Function | Description |
|---|---|
| `createEvent()` | Creates an event with a ticket price and supply |
| `buyTicket()` | Purchases a ticket and transfers payment to the organiser |
| `transferTicket()` | Transfers an unused ticket to another wallet |
| `verifyTicket()` | Retrieves ticket ownership and redemption status |
| `useTicket()` | Allows the event organiser to redeem a ticket |

### Contract Events

The smart contract emits the following events:

- `EventCreated`
- `TicketPurchased`
- `TicketTransferred`
- `TicketUsed`

These events provide an on-chain record of important ticketing operations.

### Deployed Contract

**Network:** Ethereum Sepolia Testnet

**Contract Address:**

`0xF8Ed9C6Cb8081DD3354d98aC9a51625a890FAbb6`

[View Contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xF8Ed9C6Cb8081DD3354d98aC9a51625a890FAbb6)

> The prototype uses Sepolia test ETH. No real cryptocurrency is required for testing.

## Project Structure

```text
ticket-chain/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── events.py
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── schemas.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── contract-abi.json
│
├── contracts/
│   └── EventTicketing.sol
│
├── tests/
├── docs/
├── .gitignore
└── README.md
```

The SQLite database is generated locally and is not intended to be committed to the repository.

## Getting Started

### Prerequisites

Before running the project, ensure the following are available:

- Python 3.10 or later
- Git
- A modern web browser
- MetaMask browser extension
- Access to the Ethereum Sepolia test network
- Sepolia test ETH for transactions that require gas

A local web server, such as the VS Code Live Server extension, is recommended for running the frontend.

### 1. Clone the Repository

```bash
git clone https://github.com/panamilit/ticket-chain.git
cd ticket-chain
```

### 2. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Start the FastAPI Server

From the `backend/` directory, run:

```bash
uvicorn app.main:app --reload
```

The backend will be available at:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

The SQLite database is created automatically if it does not already exist.

### 4. Start the Frontend

Open the project in VS Code.

Launch `frontend/index.html` using the Live Server extension.

The expected local address is:

`http://127.0.0.1:5500`

> The backend CORS configuration is set up for the local frontend address. If another port or hostname is used, the allowed origins must be updated accordingly.

### 5. Connect MetaMask

1. Install or open MetaMask.
2. Select the Ethereum Sepolia test network.
3. Open TicketChain in the browser.
4. Click **Connect Wallet**.
5. Approve the connection request.

The application is now ready for interaction with the deployed smart contract.

## Using TicketChain

### Creating an Event

Open the **Create Event** section and provide:

- Event name and description
- Venue and date
- Ticket price in ETH
- Total ticket supply

Submit the form and confirm the transaction in MetaMask.

After blockchain confirmation, the application retrieves the event ID and saves the additional event information through FastAPI.

The new event should then appear in the Events section.

### Purchasing a Ticket

Open **Events**, select an available event, and click **Buy Ticket**.

MetaMask will request confirmation of the transaction, including the ticket price and network gas fee.

Once confirmed, the smart contract creates a ticket associated with the buyer's Ethereum address.

### Viewing and Transferring Tickets

Open **My Tickets** to view tickets owned by the connected wallet.

Each ticket displays its ID, associated event, owner, and redemption status.

To transfer an unused ticket, click **Transfer**, enter the recipient's Ethereum address, and confirm the transaction in MetaMask.

The ticket's ownership is updated on-chain.

### Verifying a Ticket

Open **Verify**, enter a ticket ID, and click **Verify Ticket**.

The application retrieves the ticket's event ID, current owner, and redemption status directly from Ethereum.

Verification is read-only and does not require a blockchain transaction.

### Redeeming a Ticket

The organiser of the associated event can mark an unused ticket as redeemed.

When the organiser's wallet is connected, the verification interface provides a **Mark as Used** button.

After transaction confirmation, the ticket status changes to `USED`.

Redeemed tickets cannot be transferred or redeemed again.

## Backend API

The backend provides the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/events/` | Retrieve all stored event metadata |
| `GET` | `/events/{event_id}` | Retrieve an event metadata record by database ID |
| `POST` | `/events/` | Create an event metadata record |

The backend does not process cryptocurrency payments or maintain ticket ownership records. These operations are handled by the Ethereum smart contract.

## Limitations

TicketChain is an educational prototype and is not intended for production use.

Current limitations include:

- The backend and SQLite database run locally.
- Event metadata and blockchain transactions are stored separately, without an automatic recovery mechanism if metadata storage fails.
- Backend event metadata submissions do not currently include cryptographic organiser authentication.
- The application uses a custom ticket structure rather than the ERC-721 NFT standard.
- Ticket discovery uses direct smart contract reads, which may become inefficient with large numbers of tickets.
- The prototype does not include a production deployment, QR-based entry scanning, or a dedicated event organiser dashboard.

Further development would require additional security testing, backend authentication, improved indexing, and more robust infrastructure.

## Project Status

**Functional prototype completed.**

The core workflows have been implemented and manually exercised on Ethereum Sepolia:

- Event creation
- Ticket purchasing
- Wallet-based ownership
- Ticket transfers
- Ticket verification
- Ticket redemption

The prototype demonstrates how Ethereum smart contracts can provide transparent ownership records and enforce ticketing rules independently of a traditional centralised database.
