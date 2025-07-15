async function getUserId(username) {
  const res = await fetch("https://users.roproxy.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username] }),
  });
  const data = await res.json();
  return data.data[0]?.id || null;
}

async function getInventory(userId) {
  let assets = [];
  let cursor = "";
  do {
    const url = `https://inventory.roproxy.com/v1/users/${userId}/assets/collectibles?limit=100&cursor=${cursor}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.data) break;
    assets = assets.concat(data.data);
    cursor = data.nextPageCursor || "";
  } while (cursor);
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
  const username = document.getElementById("username").value.trim();
  const resultEl = document.getElementById("result");
  if (!username) {
    resultEl.textContent = "Please enter a username.";
    return;
  }

  resultEl.textContent = "Looking up user ID...";
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

  resultEl.textContent = `${username}'s Account Value\n` +
    `Collectible Items: ${assets.length}\n` +
    `Total RAP (Recent Average Price): R$${totalRAP.toLocaleString()}`;
}

document.getElementById("checkBtn").addEventListener("click", checkValue);
