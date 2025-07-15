async function getUserId(username, retries = 3) {
  const url = "https://users.roproxy.com/v1/usernames/users";
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username] }),
  };

  // Check cache first
  const cached = localStorage.getItem(`userid_${username.toLowerCase()}`);
  if (cached) return cached;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        // Rate limit, wait then retry
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const id = data.data[0]?.id || null;
      if (id) {
        localStorage.setItem(`userid_${username.toLowerCase()}`, id);
      }
      return id;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

async function getInventory(userId) {
  let assets = [];
  let cursor = "";
  try {
    do {
      const url = `https://inventory.roproxy.com/v1/users/${userId}/assets/collectibles?limit=100&cursor=${cursor}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (!data.data) break;
      assets = assets.concat(data.data);
      cursor = data.nextPageCursor || "";
    } while (cursor);
  } catch (e) {
    throw e;
  }
  return assets;
}

async function calculateRAP(assets) {
  let totalRAP = 0;
  for (const item of assets) {
    totalRAP += item.recentAveragePrice || 0;
  }
  return totalRAP;
}

async function checkValue() {
  const usernameInput = document.getElementById("username");
  const resultEl = document.getElementById("result");
  const btn = document.getElementById("checkBtn");

  const username = usernameInput.value.trim();
  if (!username) {
    resultEl.textContent = "Please enter a username.";
    return;
  }

  btn.disabled = true;
  resultEl.textContent = "Looking up user ID...";

  try {
    const userId = await getUserId(username);
    if (!userId) {
      resultEl.textContent = "User not found.";
      return;
    }

    resultEl.textContent = "Fetching inventory...";
    const assets = await getInventory(userId);
    if (!assets.length) {
      resultEl.textContent = "No collectible assets found.";
      return;
    }

    resultEl.textContent = "Calculating RAP...";
    const totalRAP = await calculateRAP(assets);

    resultEl.textContent =
      `${username}'s Account Value\n` +
      `Collectible Items: ${assets.length}\n` +
      `Total RAP (Recent Average Price): R$${totalRAP.toLocaleString()}`;
  } catch (error) {
    resultEl.textContent = `Error: ${error.message || error}`;
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("checkBtn").addEventListener("click", checkValue);
