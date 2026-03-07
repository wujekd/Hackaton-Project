(() => {
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
  const form = document.getElementById("chat-form");
  const input = document.getElementById("prompt");
  const messagesEl = document.getElementById("messages");
  const statusEl = document.getElementById("status");
  const sourcesEl = document.getElementById("sources");

  let isLoading = false;
  const chatHistory = [];

  const syncThemeButtons = () => {
    const activePreference = window.MDXTheme?.getPreference?.() || "system";
    const activeCustomThemeId = window.MDXTheme?.getActiveCustomThemeId?.() || null;
    themeButtons.forEach((button) => {
      const isActive = !activeCustomThemeId && button.dataset.themeOption === activePreference;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.MDXTheme?.setPreference?.(button.dataset.themeOption || "system");
    });
  });
  window.addEventListener("mdx-theme-change", syncThemeButtons);
  syncThemeButtons();

  const addMessage = (role, content) => {
    const item = document.createElement("li");
    item.className = `msg msg-${role}`;
    item.textContent = `${role === "user" ? "You" : "Bot"}: ${content}`;
    messagesEl.appendChild(item);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const setStatus = (value) => {
    statusEl.textContent = value;
  };

  const renderSources = (sources) => {
    sourcesEl.innerHTML = "";
    if (!sources || sources.length === 0) {
      const item = document.createElement("li");
      item.textContent = "No context retrieved.";
      sourcesEl.appendChild(item);
      return;
    }

    sources.forEach((source, index) => {
      const item = document.createElement("li");
      const score = Number(source.score ?? 0).toFixed(4);
      item.textContent = `#${index + 1} (score ${score}) ${source.content}`;
      sourcesEl.appendChild(item);
    });
  };

  const validateConfig = () => {
    if (!window.CHAT_CONFIG) {
      throw new Error("Missing CHAT_CONFIG. Create public/config.js.");
    }
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.CHAT_CONFIG;
    if (!SUPABASE_URL || SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
      throw new Error("Set SUPABASE_URL in public/config.js.");
    }
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")) {
      throw new Error("Set SUPABASE_ANON_KEY in public/config.js.");
    }
    return window.CHAT_CONFIG;
  };

  const sendMessage = async (query, history) => {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = validateConfig();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/hybrid-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ query, history, match_count: 6 })
    });

    const rawBody = await response.text();
    let json = {};
    try {
      json = rawBody ? JSON.parse(rawBody) : {};
    } catch (_error) {
      json = {};
    }

    if (!response.ok) {
      const message =
        json.error ||
        json.message ||
        (rawBody ? rawBody.slice(0, 180) : "") ||
        `Request failed (${response.status})`;
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    return json;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isLoading) return;

    const query = input.value.trim();
    if (!query) return;

    isLoading = true;
    input.value = "";
    addMessage("user", query);
    setStatus("Thinking...");

    try {
      const historyForRequest = chatHistory.slice(-20);
      const result = await sendMessage(query, historyForRequest);
      const answer = result.answer || "No answer returned.";

      addMessage("assistant", answer);
      renderSources(result.matches);

      chatHistory.push({ role: "user", content: query });
      chatHistory.push({ role: "assistant", content: answer });
      setStatus("Ready");
    } catch (error) {
      addMessage("assistant", `Error: ${error.message}`);
      setStatus("Error. Check console and config.");
    } finally {
      isLoading = false;
      input.focus();
    }
  });

  try {
    validateConfig();
    setStatus("Ready");
  } catch (error) {
    setStatus(error.message);
  }
})();
