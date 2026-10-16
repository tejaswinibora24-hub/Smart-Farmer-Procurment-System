"use strict";

// Smart Farmer Procurement System
// Front-end prototype: data is stored in the current browser session.

const state = {
  farmer: null,
  crops: [],
  bookings: [],
  notifications: [],
  statusStage: 0,
  tokenNumber: null
};

const STAGES = [
  "Submitted",
  "Slot Booked",
  "Token Issued",
  "Procured",
  "Paid"
];

function formatSlotDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

const SLOTS = [
  {
    id: 1,
    crop: "Wheat Procurement",
    date: formatSlotDate(3),
    time: "10:00 AM - 12:00 PM",
    center: "APMC Market, Pune"
  },
  {
    id: 2,
    crop: "Onion Procurement",
    date: formatSlotDate(6),
    time: "1:00 PM - 3:00 PM",
    center: "Baramati Procurement Center"
  },
  {
    id: 3,
    crop: "Soybean Procurement",
    date: formatSlotDate(10),
    time: "9:00 AM - 11:00 AM",
    center: "Indapur Mandi"
  }
];

// Safely display user-entered text inside HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[char];
  });
}

// Display current time.
function updateClock() {
  const clock = document.getElementById("clock");

  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

updateClock();
setInterval(updateClock, 30000);

// Display a temporary message.
function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

// Navigate between application pages.
function goTo(name) {
  if (!state.farmer && name !== "register") {
    showToast("Please register first.");
    return;
  }

  const target = document.getElementById("view-" + name);

  if (!target) {
    showToast("Page not found.");
    return;
  }

  document.querySelectorAll(".view").forEach(function (view) {
    view.classList.remove("active");
  });

  target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(function (button) {
    button.classList.toggle(
      "active",
      button.dataset.nav === name
    );
  });

  const wrap = document.querySelector(".view-wrap");

  if (wrap) {
    wrap.scrollTop = 0;
  }

  if (name === "home") renderHome();
  if (name === "crops") renderCrops();
  if (name === "schedule") renderSchedule();
  if (name === "status") renderStatus();
  if (name === "notifications") renderNotifications();
  if (name === "profile") renderProfile();
}

// Register a farmer.
function registerFarmer() {
  const name = document.getElementById("reg-name").value.trim();
  const mobile = document.getElementById("reg-mobile").value.trim();
  const village = document.getElementById("reg-village").value.trim();
  const lang = document.getElementById("reg-lang").value;

  if (!name || !mobile || !village) {
    showToast("Please fill in all fields.");
    return;
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    showToast("Enter a valid 10-digit mobile number.");
    return;
  }

  state.farmer = {
    name: name,
    mobile: mobile,
    village: village,
    lang: lang
  };

  document.getElementById("bottom-nav").style.display = "flex";

  pushNotification(
    "Profile created",
    "Welcome " + name + "! Your farmer profile is active.",
    "✅"
  );

  goTo("home");
  showToast("Registration successful!");
}

// Home dashboard.
function renderHome() {
  if (!state.farmer) return;

  const firstName = state.farmer.name.split(" ")[0];

  document.getElementById("home-greeting").textContent =
    "Welcome, " + firstName + "!";

  document.getElementById("home-greeting-tag").textContent =
    state.farmer.village + " · " + state.farmer.mobile;

  const nextBody = document.getElementById("next-proc-body");

  if (state.bookings.length > 0) {
    const booking = state.bookings[state.bookings.length - 1];

    nextBody.innerHTML =
      "<strong>" + escapeHTML(booking.crop) + "</strong><br>" +
      escapeHTML(booking.date) + "<br>" +
      escapeHTML(booking.time) + "<br>" +
      escapeHTML(booking.center);
  } else {
    nextBody.textContent =
      "No slot booked yet. Visit Schedule to book one.";
  }

  renderJourney(document.getElementById("home-journey"));
}

// Display application progress.
function renderJourney(container) {
  if (!container) return;

  const progress =
    (state.statusStage / (STAGES.length - 1)) * 100;

  let html =
    '<div class="journey-fill" style="width:' +
    progress +
    '%"></div>';

  STAGES.forEach(function (stage, index) {
    let className = "";
    let icon = "";

    if (index < state.statusStage) {
      className = "done";
      icon = "✓";
    } else if (index === state.statusStage) {
      className = "current";
      icon = "●";
    }

    html +=
      '<div class="jstep ' + className + '">' +
        '<div class="dot">' + icon + "</div>" +
        '<div class="lbl">' + escapeHTML(stage) + "</div>" +
      "</div>";
  });

  container.innerHTML = html;
}

// Add crop details.
function addCrop() {
  if (!state.farmer) {
    showToast("Please register first.");
    return;
  }

  const type = document.getElementById("crop-type").value;
  const quantity = Number(document.getElementById("crop-qty").value);
  const grade = document.getElementById("crop-grade").value;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    showToast("Enter a valid crop quantity.");
    return;
  }

  state.crops.push({
    type: type,
    quantity: quantity,
    grade: grade,
    id: Date.now()
  });

  document.getElementById("crop-qty").value = "";

  if (state.statusStage < 1) {
    state.statusStage = 1;
  }

  renderCrops();

  pushNotification(
    "Crop details submitted",
    quantity + " quintals of " + type + " added.",
    "🌾"
  );

  showToast("Crop details submitted successfully.");
}

// Display submitted crops.
function renderCrops() {
  const list = document.getElementById("crop-list");

  if (!list) return;

  if (state.crops.length === 0) {
    list.innerHTML =
      '<div class="empty">🌱 No crops submitted yet.</div>';
    return;
  }

  list.innerHTML = state.crops.map(function (crop) {
    return `
      <div class="row">
        <div class="row-ic">🌾</div>
        <div class="row-main">
          <div class="row-title">${escapeHTML(crop.type)}</div>
          <div class="row-sub">
            ${escapeHTML(crop.quantity)} quintals ·
            ${escapeHTML(crop.grade)}
          </div>
        </div>
        <span class="badge green">Submitted</span>
      </div>
    `;
  }).join("");
}

// Display available procurement slots.
function renderSchedule() {
  const list = document.getElementById("schedule-list");

  if (!list) return;

  list.innerHTML = SLOTS.map(function (slot) {
    const booked = state.bookings.some(function (booking) {
      return booking.id === slot.id;
    });

    const button = booked
      ? '<span class="badge gold">Booked</span>'
      : `<button class="btn btn-ghost book-btn"
          onclick="bookSlot(${slot.id})">Book Slot</button>`;

    return `
      <div class="row">
        <div class="row-ic">📅</div>
        <div class="row-main">
          <div class="row-title">${escapeHTML(slot.crop)}</div>
          <div class="row-sub">
            ${escapeHTML(slot.date)}<br>
            ${escapeHTML(slot.time)}<br>
            ${escapeHTML(slot.center)}
          </div>
        </div>
        ${button}
      </div>
    `;
  }).join("");
}

// Book a procurement slot and generate a demo token.
function bookSlot(id) {
  if (!state.farmer) {
    showToast("Please register first.");
    return;
  }

  const slot = SLOTS.find(function (item) {
    return item.id === id;
  });

  if (!slot) {
    showToast("Slot not found.");
    return;
  }

  const alreadyBooked = state.bookings.some(function (booking) {
    return booking.id === id;
  });

  if (alreadyBooked) {
    showToast("You have already booked this slot.");
    return;
  }

  const booking = { ...slot };

  state.bookings.push(booking);
  state.statusStage = Math.max(state.statusStage, 1);

  pushNotification(
    "Procurement slot booked",
    slot.crop + " · " + slot.date + " · " + slot.center,
    "📅"
  );

  // Generate a prototype token immediately.
  state.tokenNumber =
    "#SF" + Math.floor(1000 + Math.random() * 9000);

  state.statusStage = Math.max(state.statusStage, 2);

  pushNotification(
    "Digital token generated",
    "Your demo token is " + state.tokenNumber + ".",
    "🎫"
  );

  renderSchedule();
  renderHome();
  renderStatus();

  showToast("Slot booked! Token: " + state.tokenNumber);
}

// Display booking and token status.
function renderStatus() {
  const body = document.getElementById("status-body");

  if (!body) return;

  if (state.bookings.length === 0) {
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          📍 Book a procurement slot to track your status.
        </div>
        <button class="btn btn-primary"
          onclick="goTo('schedule')">Book a Slot</button>
      </div>
    `;
    return;
  }

  const booking = state.bookings[state.bookings.length - 1];

  body.innerHTML = `
    <div class="card">
      <div class="section-title">Application Progress</div>
      <div class="journey" id="status-journey"></div>
    </div>

    <div class="card leaf token-box">
      <div class="cap">Demo Digital Token</div>
      <div class="num">${escapeHTML(state.tokenNumber || "#--")}</div>
      <div class="cap">Keep this token for your demo</div>
    </div>

    <div class="card">
      <div class="row">
        <div class="row-ic">🌾</div>
        <div class="row-main">
          <div class="row-title">${escapeHTML(booking.crop)}</div>
          <div class="row-sub">
            ${escapeHTML(booking.date)} ·
            ${escapeHTML(booking.time)}
          </div>
        </div>
      </div>

      <div class="row">
        <div class="row-ic">📍</div>
        <div class="row-main">
          <div class="row-title">${escapeHTML(booking.center)}</div>
          <div class="row-sub">Your selected procurement center</div>
        </div>
      </div>

      <button class="btn btn-outline"
        onclick="markProcured()">Mark as Procured (Demo)</button>

      <button class="btn btn-ghost"
        onclick="markPaid()">Mark as Paid (Demo)</button>
    </div>
  `;

  renderJourney(document.getElementById("status-journey"));
}

// Demo-only status actions.
function markProcured() {
  if (state.bookings.length === 0) {
    showToast("Book a slot first.");
    return;
  }

  state.statusStage = Math.max(state.statusStage, 3);

  pushNotification(
    "Procurement status updated",
    "Marked as procured in this demo.",
    "🌾"
  );

  renderStatus();
  renderHome();
  showToast("Demo status updated.");
}

function markPaid() {
  if (state.bookings.length === 0) {
    showToast("Book a slot first.");
    return;
  }

  state.statusStage = 4;

  pushNotification(
    "Payment status updated",
    "Marked as paid in this demo only.",
    "✅"
  );

  renderStatus();
  renderHome();
  showToast("Demo payment status updated.");
}

// Add an application notification.
function pushNotification(title, message, icon) {
  state.notifications.unshift({
    title: title,
    message: message,
    icon: icon,
    time: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    })
  });

  renderNotifications();
}

// Display notifications.
function renderNotifications() {
  const list = document.getElementById("notif-list");

  if (!list) return;

  if (state.notifications.length === 0) {
    list.innerHTML =
      '<div class="empty">🔔 No notifications yet.</div>';
    return;
  }

  list.innerHTML = state.notifications.map(function (item) {
    return `
      <div class="row">
        <div class="row-ic">${escapeHTML(item.icon)}</div>
        <div class="row-main">
          <div class="row-title">${escapeHTML(item.title)}</div>
          <div class="row-sub">${escapeHTML(item.message)}</div>
        </div>
        <div class="row-meta">${escapeHTML(item.time)}</div>
      </div>
    `;
  }).join("");
}

// Display farmer profile.
function renderProfile() {
  if (!state.farmer) return;

  const card = document.getElementById("profile-card");

  if (!card) return;

  card.innerHTML = `
    <div class="row">
      <div class="row-ic">👤</div>
      <div class="row-main">
        <div class="row-title">${escapeHTML(state.farmer.name)}</div>
        <div class="row-sub">${escapeHTML(state.farmer.village)}</div>
      </div>
    </div>

    <div class="row">
      <div class="row-ic">📱</div>
      <div class="row-main">
        <div class="row-title">${escapeHTML(state.farmer.mobile)}</div>
        <div class="row-sub">Registered mobile number</div>
      </div>
    </div>

    <div class="row">
      <div class="row-ic">🗣️</div>
      <div class="row-main">
        <div class="row-title">${escapeHTML(state.farmer.lang)}</div>
        <div class="row-sub">Preferred language</div>
      </div>
    </div>

    <div class="row">
      <div class="row-ic">🌾</div>
      <div class="row-main">
        <div class="row-title">${state.crops.length} crop entries</div>
        <div class="row-sub">Submitted crops</div>
      </div>
    </div>

    <div class="row">
      <div class="row-ic">📅</div>
      <div class="row-main">
        <div class="row-title">${state.bookings.length} bookings</div>
        <div class="row-sub">Procurement slots booked</div>
      </div>
    </div>
  `;
}

// Return to registration and clear demo data.
function logout() {
  const confirmed = window.confirm(
    "Return to registration and clear current demo data?"
  );

  if (!confirmed) return;

  state.farmer = null;
  state.crops = [];
  state.bookings = [];
  state.notifications = [];
  state.statusStage = 0;
  state.tokenNumber = null;

  document.getElementById("reg-name").value = "";
  document.getElementById("reg-mobile").value = "";
  document.getElementById("reg-village").value = "";

  document.getElementById("bottom-nav").style.display = "none";

  goTo("register");
  renderCrops();
  renderSchedule();
  renderNotifications();

  showToast("Returned to registration.");
}

// Initial rendering.
renderCrops();
renderSchedule();
renderNotifications();