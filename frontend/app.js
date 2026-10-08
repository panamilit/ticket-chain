const CONTRACT_ADDRESS = "0xF8Ed9C6Cb8081DD3354d98aC9a51625a890FAbb6";
const SEPOLIA_CHAIN_ID = 11155111n;
const API_URL = "http://127.0.0.1:8000";

let contract;
let isConnecting = false;
let selectedEventId = null;


function showSection(name) {
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = view.id !== name;
  });

  const activeTab = name === "event" ? "events" : name;

  document.querySelectorAll(".tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === activeTab);
  });
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    showSection(button.dataset.view);

    if (button.dataset.view === "tickets") {
      loadMyTickets();
    }
  });
});


async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  if (contract) return contract;

  const response = await fetch("./contract-abi.json");
  if (!response.ok) throw new Error("Failed to load contract ABI");

  const abi = await response.json();
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error("Please switch MetaMask to Sepolia");
  }

  contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
  return contract;
}


function openEvent(row) {
  document.querySelector("#d-name").textContent =
    row.querySelector(".name").textContent;

  document.querySelector("#d-price").textContent =
    row.querySelector(".price").textContent;

  document.querySelector("#d-desc").textContent = row.dataset.desc;
  document.querySelector("#d-organizer").textContent = row.dataset.organizer;
  document.querySelector("#d-supply").textContent = row.dataset.supply;
  document.querySelector("#d-sold").textContent = row.dataset.sold;

  selectedEventId = Number(row.dataset.eventId);

  showSection("event");
}


async function loadEvents() {
  const container = document.querySelector("#events-list");
  container.textContent = "Loading events...";

  try {
    const response = await fetch(`${API_URL}/events/`);
    if (!response.ok) throw new Error("Failed to load events from FastAPI");

    const events = await response.json();
    const ticketContract = await getContract();

    container.replaceChildren();

    for (const event of events) {
      const onChain = await ticketContract.events(event.contract_event_id);

      if (onChain.organizer === ethers.ZeroAddress) {
        console.warn("Event not found on-chain:", event.contract_event_id);
        continue;
      }

      const available = onChain.supply - onChain.sold;
      const priceEth = ethers.formatEther(onChain.price);

      const article = document.createElement("article");
      article.className = "event";

      article.dataset.eventId = event.contract_event_id;
      article.dataset.desc = event.description;
      article.dataset.organizer = onChain.organizer;
      article.dataset.supply = onChain.supply.toString();
      article.dataset.sold = onChain.sold.toString();

      const index = document.createElement("span");
      index.className = "event-index";
      index.setAttribute("aria-hidden", "true");
      index.textContent =
        `TC / ${String(event.contract_event_id + 1).padStart(3, "0")}`;

      const info = document.createElement("div");

      const name = document.createElement("h3");
      name.className = "name";
      name.textContent = event.name;

      const date = document.createElement("p");
      date.className = "meta";
      date.textContent = `${event.date} · ${event.venue}`;

      const details = document.createElement("p");
      details.className = "meta";

      const price = document.createElement("span");
      price.className = "price";
      price.textContent = `${priceEth} ETH`;

      details.append(
        price,
        document.createTextNode(` · ${available} tickets available`)
      );

      info.append(name, date, details);

      const button = document.createElement("button");
      button.className = "view-event";
      button.textContent = "View";
      button.addEventListener("click", () => openEvent(article));

      article.append(index, info, button);
      container.appendChild(article);
    }

    if (!container.children.length) {
      container.textContent = "No events available.";
    }

  } catch (error) {
    console.error("Failed to load events:", error);
    container.textContent = `Could not load events: ${error.message}`;
  }
}


async function loadMyTickets() {
  const container = document.querySelector(".ticket-list");
  container.textContent = "Loading tickets...";

  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);

    if (!accounts.length) {
      container.textContent = "Connect your wallet to view tickets.";
      return;
    }

    const ticketContract = await getContract();
    const walletAddress = accounts[0].toLowerCase();
    const totalTickets = Number(await ticketContract.nextTicketId());

    const response = await fetch(`${API_URL}/events/`);
    if (!response.ok) throw new Error("Failed to load event metadata");

    const events = await response.json();
    const eventNames = new Map(
      events.map((event) => [event.contract_event_id, event.name])
    );

    container.replaceChildren();

    for (let id = 0; id < totalTickets; id++) {
      const ticket = await ticketContract.tickets(id);

      if (ticket.owner.toLowerCase() !== walletAddress) {
        continue;
      }

      const article = document.createElement("article");
      article.className = "ticket";

      const info = document.createElement("div");
      info.className = "ticket-info";

      const name = document.createElement("h3");
      name.textContent =
        eventNames.get(Number(ticket.eventId)) || `Event #${ticket.eventId}`;

      const details = document.createElement("dl");

      const idLabel = document.createElement("dt");
      idLabel.textContent = "Ticket ID";

      const idValue = document.createElement("dd");
      idValue.className = "mono";
      idValue.textContent = `#${id}`;

      const ownerLabel = document.createElement("dt");
      ownerLabel.textContent = "Owner";

      const ownerValue = document.createElement("dd");
      ownerValue.className = "mono";
      ownerValue.textContent =
        `${ticket.owner.slice(0, 6)}...${ticket.owner.slice(-4)}`;

      details.append(idLabel, idValue, ownerLabel, ownerValue);
      info.append(name, details);

      const stub = document.createElement("div");
      stub.className = "ticket-stub";

      const status = document.createElement("span");
      status.className = `status ${ticket.isUsed ? "used" : "valid"}`;
      status.textContent = ticket.isUsed ? "USED" : "VALID";

      const button = document.createElement("button");
      button.textContent = "Transfer";
      button.disabled = ticket.isUsed;

      button.addEventListener("click", async () => {
        button.disabled = true;

        try {
          await transferTicket(id);
        } finally {
          button.disabled = false;
        }
      });

      stub.append(status, button);
      article.append(info, stub);
      container.appendChild(article);
    }

    if (!container.children.length) {
      container.textContent = "You don't own any tickets yet.";
    }

  } catch (error) {
    console.error("Failed to load tickets:", error);
    container.textContent = `Could not load tickets: ${error.message}`;
  }
}

// MetaMask

const walletButton = document.getElementById("wallet");

async function connectWallet() {
  if (isConnecting) return;

  if (!window.ethereum) {
    alert("Please install MetaMask.");
    return;
  }

  isConnecting = true;
  walletButton.disabled = true;

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("wallet_requestPermissions", [
      { eth_accounts: {} }
    ]);

    const accounts = await provider.send("eth_accounts", []);
    const network = await provider.getNetwork();

    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      alert("Please switch MetaMask to Sepolia.");
      return;
    }

    if (!accounts.length) {
      walletButton.textContent = "Connect Wallet";
      return;
    }

    const address = accounts[0];

    walletButton.textContent =
      `${address.slice(0, 6)}...${address.slice(-4)}`;

    if (!document.querySelector("#tickets").hidden) {
      await loadMyTickets();
    }

  } catch (error) {
    console.error(error);

    if (error.code === -32002 || error.error?.code === -32002) {
      alert("A MetaMask request is already pending. Check your wallet.");
    } else if (
      error.code !== 4001 &&
      error.code !== "ACTION_REJECTED"
    ) {
      alert("Wallet connection failed.");
    }

  } finally {
    isConnecting = false;
    walletButton.disabled = false;
  }
}

walletButton.addEventListener("click", connectWallet);


if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    walletButton.textContent = accounts.length
      ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
      : "Connect Wallet";

    if (!document.querySelector("#tickets").hidden) {
      loadMyTickets();
    }
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}



document.querySelector("#create-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"], button:not([type])');

  if (!window.ethereum) {
    alert("Please install MetaMask.");
    return;
  }

  const formData = new FormData(form);

  const name = String(formData.get("name")).trim();
  const description = String(formData.get("description")).trim();
  const venue = String(formData.get("venue")).trim();
  const date = String(formData.get("date"));
  const price = String(formData.get("price"));
  const supply = Number(formData.get("supply"));

  if (!name || !description || !venue || !date) {
    alert("Please complete all event details.");
    return;
  }

  if (!Number.isSafeInteger(supply) || supply < 1) {
    alert("Ticket supply must be a positive integer.");
    return;
  }

  let contractEventId = null;

  button.disabled = true;
  button.textContent = "Creating event...";

  try {
    const ticketContract = await getContract();
    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts.length) {
      throw new Error("Wallet not connected");
    }

    const network = await provider.getNetwork();
    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error("Please switch MetaMask to Sepolia");
    }

    const signer = await provider.getSigner();

    const priceWei = ethers.parseEther(price);

    const tx = await ticketContract
      .connect(signer)
      .createEvent(priceWei, BigInt(supply));

    console.log("Create event transaction:", tx.hash);

    button.textContent = "Waiting for confirmation...";

    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error("Blockchain transaction failed");
    }

    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        continue;
      }

      try {
        const parsed = ticketContract.interface.parseLog(log);

        if (parsed && parsed.name === "EventCreated") {
          contractEventId = Number(parsed.args.eventId);
          break;
        }
      } catch {
        
      }
    }

    if (contractEventId === null) {
      throw new Error(
        `Event created on-chain (transaction ${tx.hash}), ` +
        "but EventCreated log was not found."
      );
    }

    
    button.textContent = "Saving event details...";

    const response = await fetch(`${API_URL}/events/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contract_event_id: contractEventId,
        name,
        description,
        venue,
        date
      })
    });

    if (!response.ok) {
      throw new Error(
        `Event #${contractEventId} was created on Sepolia, ` +
        `but saving metadata failed (HTTP ${response.status}).`
      );
    }

    alert(`Event #${contractEventId} created successfully!`);

    form.reset();
    showSection("events");
    await loadEvents();

  } catch (error) {
    console.error("Event creation failed:", error);

    if (contractEventId !== null) {
      alert(
        `Event #${contractEventId} exists on Sepolia, ` +
        `but the operation was not completed: ${error.message}\n\n` +
        "Do not submit the form again yet."
      );
    } else {
      alert(error.shortMessage || error.message);
    }

  } finally {
    button.disabled = false;
    button.textContent = "Create Event";
  }
});


document.querySelector("#verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  const result = document.querySelector("#result");

  const ticketId = Number(input.value);

  result.hidden = false;
  result.textContent = "Verifying ticket...";
  button.disabled = true;

  try {
    const ticketContract = await getContract();
    const totalTickets = await ticketContract.nextTicketId();

    if (!Number.isSafeInteger(ticketId) ||
        ticketId < 0 ||
        BigInt(ticketId) >= totalTickets) {
      throw new Error("Ticket does not exist");
    }

    const [eventId, owner, isUsed] =
      await ticketContract.verifyTicket(ticketId);

    const eventData = await ticketContract.events(eventId);

    result.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = `Ticket #${ticketId}`;

    const eventInfo = document.createElement("p");
    eventInfo.textContent = `Event ID: ${eventId}`;

    const ownerInfo = document.createElement("p");
    ownerInfo.textContent = `Owner: ${owner}`;
    ownerInfo.className = "mono";

    const status = document.createElement("p");
    status.textContent = isUsed ? "Status: USED" : "Status: VALID";

    result.append(heading, eventInfo, ownerInfo, status);

    if (!isUsed) {
      const accounts = await window.ethereum.request({
        method: "eth_accounts"
      });

      const currentAccount = accounts[0]?.toLowerCase();
      const organizer = eventData.organizer.toLowerCase();

      if (currentAccount === organizer) {
        const useButton = document.createElement("button");
        useButton.className = "primary";
        useButton.textContent = "Mark as Used";

        useButton.addEventListener("click", async () => {
          useButton.disabled = true;
          useButton.textContent = "Waiting for confirmation...";

          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const tx = await ticketContract
              .connect(signer)
              .useTicket(ticketId);

            const receipt = await tx.wait();

            if (receipt.status !== 1) {
              throw new Error("Transaction failed");
            }

            status.textContent = "Status: USED";
            useButton.remove();

            alert("Ticket marked as used successfully!");

          } catch (error) {
            console.error("Failed to use ticket:", error);
            alert(error.shortMessage || error.message);
            useButton.disabled = false;
            useButton.textContent = "Mark as Used";
          }
        });

        result.appendChild(useButton);
      }
    }

  } catch (error) {
    console.error("Verification failed:", error);
    result.textContent = `Verification failed: ${error.shortMessage || error.message}`;

  } finally {
    button.disabled = false;
  }
});


async function buyTicket() {
  const button = document.querySelector("#buy-ticket");

  if (selectedEventId === null) {
    alert("Please select an event.");
    return;
  }

  if (!window.ethereum) {
    alert("Please install MetaMask.");
    return;
  }

  button.disabled = true;

  try {
    const ticketContract = await getContract();
    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts.length) throw new Error("Wallet not connected");

    const network = await provider.getNetwork();
    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error("Please switch MetaMask to Sepolia");
    }

    const signer = await provider.getSigner();
    const eventData = await ticketContract.events(selectedEventId);

    if (eventData.sold >= eventData.supply) {
      throw new Error("Event is sold out");
    }

    const tx = await ticketContract.connect(signer).buyTicket(
      selectedEventId,
      { value: eventData.price }
    );

    console.log("Transaction:", tx.hash);

    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error("Transaction failed");
    }

    alert("Ticket purchased successfully!");
    await loadEvents();

  } catch (error) {
    console.error("Purchase failed:", error);
    alert(error.shortMessage || error.message);

  } finally {
    button.disabled = false;
  }
}

document.querySelector("#buy-ticket").addEventListener("click", buyTicket);

async function transferTicket(ticketId) {
  const newOwner = prompt("Enter recipient wallet address:");

  if (newOwner === null) return;

  if (!ethers.isAddress(newOwner) || newOwner === ethers.ZeroAddress) {
    alert("Invalid Ethereum address.");
    return;
  }

  try {
    const ticketContract = await getContract();
    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts.length) {
      throw new Error("Wallet not connected");
    }

    const network = await provider.getNetwork();
    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error("Please switch MetaMask to Sepolia");
    }

    const signer = await provider.getSigner();
    const currentOwner = await signer.getAddress();

    if (currentOwner.toLowerCase() === newOwner.toLowerCase()) {
      throw new Error("You already own this ticket");
    }

    const contractWithSigner = ticketContract.connect(signer);

    const tx = await contractWithSigner.transferTicket(ticketId, newOwner);

    console.log("Transfer transaction:", tx.hash);

    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error("Transfer failed");
    }

    alert("Ticket transferred successfully!");
    await loadMyTickets();

  } catch (error) {
    console.error("Transfer failed:", error);
    alert(error.shortMessage || error.message);
  }
}

// Initial load

loadEvents();
