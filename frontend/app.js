
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
  button.addEventListener("click", () => showSection(button.dataset.view));
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

      // Ignore metadata pointing to a non-existent on-chain event.
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
      index.textContent = `TC / ${String(event.contract_event_id + 1).padStart(3, "0")}`;

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
    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();

    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      alert("Please switch MetaMask to Sepolia.");
      return;
    }

    const address = accounts[0];

    walletButton.textContent =
      `${address.slice(0, 6)}...${address.slice(-4)}`;

  } catch (error) {
    console.error(error);

    if (error.code === -32002 || error.error?.code === -32002) {
      alert("A MetaMask request is already pending. Check your wallet.");
    } else if (error.code !== 4001 && error.code !== "ACTION_REJECTED") {
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
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}

//  (not connected yet)

document.querySelector("#create-form").addEventListener("submit", (event) => {
  event.preventDefault();
});

document.querySelector("#verify-form").addEventListener("submit", (event) => {
  event.preventDefault();
});


loadEvents();



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
