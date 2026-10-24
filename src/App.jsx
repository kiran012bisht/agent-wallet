import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const startingTransactions = [
  { id: 1, name: "Coffee House", address: "0xA12f...89Bc", amount: 250, status: "approved", reason: "Routine payment" },
  { id: 2, name: "Study Materials", address: "0xB43c...72De", amount: 680, status: "approved", reason: "Known recipient" },
  { id: 3, name: "Unknown Wallet", address: "0xBAD...0000", amount: 2200, status: "review", reason: "Unrecognized recipient" },
  { id: 4, name: "Suspicious Store", address: "invalid-address", amount: 900, status: "review", reason: "Suspicious recipient details" }
];

const startingRecipients = [
  { id: 1, name: "Coffee House", address: "0xA12f...89Bc", trusted: true },
  { id: 2, name: "Study Materials", address: "0xB43c...72De", trusted: true }
];

const menu = [
  "Overview",
  "Review Queue",
  "Auto-Approved",
  "Spending Rules",
  "Make a Payment",
  "Recipients"
];

function money(value) {
  return "₹" + Number(value).toLocaleString("en-IN");
}

function Badge({ status }) {
  const label = {
    approved: "Auto-approved",
    review: "Needs review",
    denied: "Denied"
  };

  return (
    <span className={"status-badge " + status}>
      {label[status] || status}
    </span>
  );
}

function Heading({ title, subtitle }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">AGENT WALLET</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="live-pill">
        <span className="live-dot" />
        Demo mode
      </div>
    </div>
  );
}

function Transaction({ item, onDecision, canReview }) {
  return (
    <article className="transaction-card">
      <div className="transaction-icon">
        {item.status === "review" ? "!" : item.status === "denied" ? "×" : "₹"}
      </div>

      <div className="transaction-info">
        <h3>{item.name}</h3>
        <p>{item.address}</p>
        <p className="transaction-reason">{item.reason}</p>
      </div>

      <div className="transaction-right">
        <strong>{money(item.amount)}</strong>
        <Badge status={item.status} />
      </div>

      {canReview && (
        <div className="transaction-actions">
          <button
            className="button button-primary"
            onClick={() => onDecision(item.id, "approved")}
          >
            Approve
          </button>
          <button
            className="button button-danger"
            onClick={() => onDecision(item.id, "denied")}
          >
            Deny
          </button>
        </div>
      )}
    </article>
  );
}

function App() {
  const [page, setPage] = useState("Overview");
  const [transactions, setTransactions] = useState(startingTransactions);
  const [recipients, setRecipients] = useState(startingRecipients);
  const [dailyLimit, setDailyLimit] = useState("5000");
  const [paymentLimit, setPaymentLimit] = useState("1000");
  const [notice, setNotice] = useState("");

  const [payName, setPayName] = useState("");
  const [payAddress, setPayAddress] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payCategory, setPayCategory] = useState("Other");

  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const approved = transactions.filter(
    (item) => item.status === "approved"
  );
  const review = transactions.filter(
    (item) => item.status === "review"
  );
  const denied = transactions.filter(
    (item) => item.status === "denied"
  );

  const total = approved.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  function showNotice(text) {
    setNotice(text);
  }

  function decide(id, status) {
    setTransactions((old) =>
      old.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
    showNotice(status === "approved" ? "Payment approved in demo." : "Payment denied in demo.");
  }

  async function submitPayment(event) {
    event.preventDefault();

    const name = payName.trim();
    const address = payAddress.trim();
    const amount = Number(payAmount);

    if (!name || !address || !Number.isFinite(amount) || amount <= 0) {
      showNotice("Enter valid payment details.");
      return;
    }

    const recipient = recipients.find(
      (item) => item.address.toLowerCase() === address.toLowerCase()
    );

    let decision;
    try {
      const response = await fetch(`${API_URL}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          amount,
          category: payCategory,
          recipientTrusted: Boolean(recipient?.trusted),
          paymentLimit: Number(paymentLimit),
          dailyLimit: Number(dailyLimit),
          approvedSpent: approved.reduce((sum, item) => sum + item.amount, 0)
        })
      });
      if (!response.ok) throw new Error("Policy service returned an error.");
      decision = await response.json();
    } catch {
      showNotice("Python policy service is unavailable. Start the backend and try again.");
      return;
    }

    const status = decision.status;
    const reason = decision.reason;

    const payment = {
      id: Date.now(),
      name,
      address,
      amount,
      status,
      reason,
      category: payCategory
    };

    setTransactions((old) => [payment, ...old]);
    setPayName("");
    setPayAddress("");
    setPayAmount("");
    setPage(status === "review" ? "Review Queue" : "Auto-Approved");

    showNotice(
      status === "review"
        ? `Python policy agent flagged this payment: ${reason}`
        : status === "denied"
          ? `Python policy agent denied this payment: ${reason}`
          : `Python policy agent approved this demo request: ${reason}`
    );
  }

  function submitRecipient(event) {
    event.preventDefault();

    const name = newName.trim();
    const address = newAddress.trim();

    if (!name || !address) {
      showNotice("Enter the recipient name and address.");
      return;
    }

    const exists = recipients.some(
      (item) => item.address.toLowerCase() === address.toLowerCase()
    );

    if (exists) {
      showNotice("That address is already listed.");
      return;
    }

    const valid = /^0x[a-fA-F0-9]{40}$/.test(address);
    const suspicious = /spam|scam|phishing|fake|suspicious/i.test(name);

    setRecipients((old) => [
      ...old,
      {
        id: Date.now(),
        name,
        address,
        trusted: valid && !suspicious
      }
    ]);

    setNewName("");
    setNewAddress("");
    showNotice(valid && !suspicious ? "Recipient added." : "Recipient added for review.");
  }

  function renderOverview() {
    return (
      <>
        <Heading
          title="Your money, on autopilot."
          subtitle="Let your agent handle routine payments while you stay in control."
        />

        <div className="welcome-card">
          <div>
            <p className="welcome-label">YOUR WALLET AT A GLANCE</p>
            <h2>Spend smarter. Worry less.</h2>
            <p>Routine payments handled automatically. Exceptions stay with you.</p>
          </div>
          <div className="welcome-symbol">₹</div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Auto-approved</span>
            <strong>{approved.length}</strong>
            <span className="stat-foot">Payments</span>
          </div>
          <div className="stat-card stat-warning">
            <span className="stat-label">Awaiting review</span>
            <strong>{review.length}</strong>
            <span className="stat-foot">Need your attention</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Approved amount</span>
            <strong>{money(total)}</strong>
            <span className="stat-foot">Demo transactions</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Daily limit</span>
            <strong>{money(dailyLimit)}</strong>
            <span className="stat-foot">Current demo rule</span>
          </div>
        </div>

        <section className="section-block">
          <div className="section-title-row">
            <h2>Quick actions</h2>
          </div>

          <div className="action-grid">
            {[
              ["Review payments", "Check suspicious activity", "Review Queue"],
              ["Auto-approved", "See approved payments", "Auto-Approved"],
              ["Spending rules", "Set your payment limits", "Spending Rules"],
              ["Make a payment", "Create a demo payment", "Make a Payment"]
            ].map(([title, description, target]) => (
              <button
                className="action-card"
                key={target}
                onClick={() => setPage(target)}
              >
                <span className="action-title">{title}</span>
                <span className="action-description">{description}</span>
                <span className="action-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        <section className="section-block">
          <h2>Recent transactions</h2>
          <div className="transaction-list">
            {transactions.slice(0, 4).map((item) => (
              <Transaction
                key={item.id}
                item={item}
                onDecision={decide}
                canReview={false}
              />
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderReview() {
    return (
      <>
        <Heading
          title="Review Queue"
          subtitle="Check flagged payments before approving or denying them."
        />
        <div className="notice-card">
          <span className="notice-icon">!</span>
          <div>
            <strong>Your approval matters.</strong>
            <p>Check the recipient and reason before making a decision.</p>
          </div>
        </div>

        <div className="transaction-list">
          {review.length === 0 ? (
            <div className="empty-state">
              <h3>All clear!</h3>
              <p>No payments need review.</p>
            </div>
          ) : (
            review.map((item) => (
              <Transaction
                key={item.id}
                item={item}
                onDecision={decide}
                canReview={true}
              />
            ))
          )}
        </div>
      </>
    );
  }

  function renderApproved() {
    return (
      <>
        <Heading
          title="Payment history"
          subtitle="View approved and denied demo transactions."
        />
        <section className="section-block">
          <h2>Auto-approved payments</h2>
          <div className="transaction-list">
            {approved.length === 0 ? (
              <p className="empty-note">No approved payments.</p>
            ) : (
              approved.map((item) => (
                <Transaction key={item.id} item={item} canReview={false} />
              ))
            )}
          </div>
        </section>

        <section className="section-block">
          <h2>Denied payments</h2>
          <div className="transaction-list">
            {denied.length === 0 ? (
              <p className="empty-note">No denied payments.</p>
            ) : (
              denied.map((item) => (
                <Transaction key={item.id} item={item} canReview={false} />
              ))
            )}
          </div>
        </section>
      </>
    );
  }

  function renderRules() {
    return (
      <>
        <Heading
          title="Spending Rules"
          subtitle="Choose the limits for this wallet demo."
        />

        <div className="form-card">
          <h2>Your wallet boundaries</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (Number(dailyLimit) <= 0 || Number(paymentLimit) <= 0) {
                showNotice("Limits must be greater than zero.");
                return;
              }

              if (Number(paymentLimit) > Number(dailyLimit)) {
                showNotice("Payment limit cannot exceed the daily limit.");
                return;
              }

              showNotice("Spending rules saved in demo.");
            }}
          >
            <label htmlFor="dailyLimit">Daily spending limit (₹)</label>
            <input
              id="dailyLimit"
              type="number"
              min="1"
              required
              value={dailyLimit}
              onChange={(event) => setDailyLimit(event.target.value)}
            />

            <label htmlFor="paymentLimit">Maximum per payment (₹)</label>
            <input
              id="paymentLimit"
              type="number"
              min="1"
              required
              value={paymentLimit}
              onChange={(event) => setPaymentLimit(event.target.value)}
            />

            <div className="rule-tip">
              <span>✦</span>
              <p>New recipients and payments outside your limits should be reviewed.</p>
            </div>

            <button className="button button-primary button-wide" type="submit">
              Save spending rules
            </button>
          </form>
        </div>
      </>
    );
  }

  function renderPayment() {
    return (
      <>
        <Heading
          title="Make a Payment"
          subtitle="Submit a payment to the Python policy agent for a decision."
        />

        <div className="form-card">
          <h2>New payment</h2>
          <form onSubmit={submitPayment}>
            <label htmlFor="payName">Recipient name</label>
            <input
              id="payName"
              value={payName}
              onChange={(event) => setPayName(event.target.value)}
              placeholder="Book Store"
              required
            />

            <label htmlFor="payAddress">Wallet address</label>
            <input
              id="payAddress"
              value={payAddress}
              onChange={(event) => setPayAddress(event.target.value)}
              placeholder="Recipient wallet address"
              required
            />

            <label htmlFor="payAmount">Amount (₹)</label>
            <input
              id="payAmount"
              type="number"
              min="1"
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
              placeholder="500"
              required
            />

            <label htmlFor="payCategory">Category</label>
            <select
              id="payCategory"
              value={payCategory}
              onChange={(event) => setPayCategory(event.target.value)}
            >
              <option>Food</option>
              <option>Education</option>
              <option>Shopping</option>
              <option>Transport</option>
              <option>Bills</option>
              <option>Other</option>
            </select>

            <div className="rule-tip">
              <span>✦</span>
              <p>Python evaluates this request. This demo does not transfer money or call the blockchain.</p>
            </div>

            <button className="button button-primary button-wide" type="submit">
              Check and submit payment
            </button>
          </form>
        </div>
      </>
    );
  }

  function renderRecipients() {
    return (
      <>
        <Heading
          title="Recipients"
          subtitle="Manage the recipients stored in this demo."
        />

        <div className="form-card recipient-form">
          <h2>Add a recipient</h2>
          <form onSubmit={submitRecipient}>
            <label htmlFor="newName">Recipient name</label>
            <input
              id="newName"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Book Store"
              required
            />

            <label htmlFor="newAddress">Wallet address</label>
            <input
              id="newAddress"
              value={newAddress}
              onChange={(event) => setNewAddress(event.target.value)}
              placeholder="0x followed by 40 hexadecimal characters"
              required
            />

            <button className="button button-primary button-wide" type="submit">
              Add recipient
            </button>
          </form>
        </div>

        <section className="section-block">
          <h2>Your recipients</h2>
          <div className="recipient-list">
            {recipients.map((item) => (
              <article className="recipient-card" key={item.id}>
                <div className="recipient-avatar">
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="recipient-info">
                  <h3>{item.name}</h3>
                  <p>{item.address}</p>
                </div>
                <span className={"status-badge " + (item.trusted ? "approved" : "review")}>
                  {item.trusted ? "Trusted" : "Review needed"}
                </span>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderPage() {
    switch (page) {
      case "Review Queue":
        return renderReview();
      case "Auto-Approved":
        return renderApproved();
      case "Spending Rules":
        return renderRules();
      case "Make a Payment":
        return renderPayment();
      case "Recipients":
        return renderRecipients();
      default:
        return renderOverview();
    }
  }

  return (
    <div className="app-shell">
      <div className="money-rain" aria-hidden="true">
        {Array.from({ length: 25 }, (_, index) => (
          <span
            className="falling-note"
            key={index}
            style={{
              left: `${(index * 37) % 100}%`,
              animationDelay: `${(index % 9) * -1.7}s`,
              animationDuration: `${12 + (index % 7) * 2}s`
            }}
          >
            ₹
          </span>
        ))}
      </div>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">a.</div>
          <div>
            <h2>Agent Wallet</h2>
            <p>Intelligent spending</p>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="side-nav">
          {menu.map((item) => (
            <button
              key={item}
              className={"nav-button " + (page === item ? "nav-active" : "")}
              onClick={() => setPage(item)}
            >
              <span className="nav-icon">
                {item === "Overview" ? "⌂" :
                  item === "Review Queue" ? "◉" :
                  item === "Auto-Approved" ? "✓" :
                  item === "Spending Rules" ? "⚙" :
                  item === "Make a Payment" ? "↗" : "♧"}
              </span>
              <span>{item}</span>
              {item === "Review Queue" && review.length > 0 && (
                <span className="nav-count">{review.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="agent-status">
            <span className="live-dot" />
            <div>
              <strong>Agent is standing by</strong>
              <p>Demo simulation only</p>
            </div>
          </div>
          <p className="sidebar-footnote">
            You set the rules.
            <br />
            Your wallet follows them.
          </p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">DEMO ENVIRONMENT</span>
            <div className="profile-circle">A</div>
          </div>
        </header>

        <div className="page-content">{renderPage()}</div>

        <footer className="footer">
          <span>Agent Wallet © 2026</span>
          <span>Designed for safer autonomous payments</span>
        </footer>
      </main>

      {notice}
    </div> 
  );
}

export default App;