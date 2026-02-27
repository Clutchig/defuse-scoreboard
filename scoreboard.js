// ==UserScript==
// @name         Defuse Scoreboard + Kill Tracker
// @namespace    https://github.com/Clutchig/defuse-scoreboard
// @version      1.0
// @description  Persistent W/L + Kill tracker for Defly Defuse
// @author       Clutchig
// @match        *://defly.io/*
// @match        *://*.defly.io/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Clutchig/defuse-scoreboard/main/scoreboard.js
// @downloadURL  https://raw.githubusercontent.com/Clutchig/defuse-scoreboard/main/scoreboard.js
// ==/UserScript==

(() => {
    if (window.defuseStatsLoaded) return;
    window.defuseStatsLoaded = true;

    let wins = parseInt(localStorage.getItem("defuseWins")) || 0;
    let losses = parseInt(localStorage.getItem("defuseLosses")) || 0;
    let kills = parseInt(localStorage.getItem("defuseKills")) || 0;
    let tracking = localStorage.getItem("defuseTracking") === "true";
    let visState = parseInt(localStorage.getItem("defuseVisState")) || 0;
    let lastCounted = "";
    let lastKillCounted = "";
    let board = null;
    let scoreEl = null;
    let killsEl = null;
    let sessionEl = null;

    let startTime = localStorage.getItem("defuseStartTime") || "";
    let startScore = localStorage.getItem("defuseStartScore") || "";
    let stopTime = localStorage.getItem("defuseStopTime") || "";
    let stopScore = localStorage.getItem("defuseStopScore") || "";

    function save() {
        localStorage.setItem("defuseWins", wins);
        localStorage.setItem("defuseLosses", losses);
        localStorage.setItem("defuseKills", kills);
        localStorage.setItem("defuseTracking", tracking);
        localStorage.setItem("defuseVisState", visState);
        localStorage.setItem("defuseStartTime", startTime);
        localStorage.setItem("defuseStartScore", startScore);
        localStorage.setItem("defuseStopTime", stopTime);
        localStorage.setItem("defuseStopScore", stopScore);
    }

    function showToast(text) {
        const toast = document.createElement("div");
        toast.textContent = text;

        toast.style.position = "fixed";
        toast.style.top = "15px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%) translateY(-10px)";
        toast.style.padding = "6px 14px";
        toast.style.background = "#FF9C4C";
        toast.style.color = "white";
        toast.style.fontSize = "14px";
        toast.style.fontWeight = "bold";
        toast.style.borderRadius = "8px";
        toast.style.zIndex = "9999999";
        toast.style.opacity = "0";
        toast.style.transition = "all 0.25s ease";
        toast.style.pointerEvents = "none";

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateX(-50%) translateY(0)";
        });

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(-50%) translateY(-10px)";
            setTimeout(() => toast.remove(), 250);
        }, 1500);
    }

    function formatTime(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }

    function toggleTracking() {
        tracking = !tracking;
        if (tracking) {
            startTime = new Date().toISOString();
            startScore = `${wins} - ${losses}`;
            stopTime = "";
            stopScore = "";
        } else {
            stopTime = new Date().toISOString();
            stopScore = `${wins} - ${losses}`;
        }
        updateBoard();
        showToast(tracking ? "W-L tracking started" : "W-L tracking stopped");
    }

    function clearBoard() {
        tracking = false;
        wins = 0;
        losses = 0;
        kills = 0;
        lastCounted = "";
        lastKillCounted = "";
        startTime = "";
        startScore = "";
        stopTime = "";
        stopScore = "";
        updateBoard();
        showToast("Scoreboard cleared");
    }

    function insertBoard() {
        const countdown = document.getElementById("countdown");
        const bombMsg = document.getElementById("countdown-bomb-message");
        if (!countdown || !bombMsg || board) return;

        board = document.createElement("div");
        board.style.display = "inline-flex";
        board.style.flexDirection = "column";
        board.style.alignItems = "center";
        board.style.margin = "6px auto";
        board.style.padding = "6px 18px";
        board.style.background = "#3D5DFF";
        board.style.color = "white";
        board.style.fontSize = "16px";
        board.style.fontWeight = "bold";
        board.style.borderRadius = "14px";
        board.style.cursor = "pointer";
        board.style.userSelect = "none";
        board.style.textAlign = "center";
        board.style.boxShadow = "0 0 15px rgba(0,0,0,0.4)";
        board.style.transition = "transform 0.25s ease, filter 0.25s ease";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.alignItems = "center";
        topRow.style.gap = "8px";

        scoreEl = document.createElement("span");

        killsEl = document.createElement("span");
        killsEl.style.display = "inline-flex";
        killsEl.style.alignItems = "center";
        killsEl.style.gap = "3px";
        killsEl.style.fontSize = "14px";
        killsEl.style.opacity = "0.9";

        const clearBtn = document.createElement("span");
        clearBtn.textContent = "✕";
        clearBtn.style.marginLeft = "4px";
        clearBtn.style.cursor = "pointer";
        clearBtn.style.fontSize = "13px";
        clearBtn.style.opacity = "0.6";
        clearBtn.style.transition = "opacity 0.15s";
        clearBtn.addEventListener("mouseenter", () => clearBtn.style.opacity = "1");
        clearBtn.addEventListener("mouseleave", () => clearBtn.style.opacity = "0.6");
        clearBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            clearBoard();
        });

        topRow.appendChild(scoreEl);
        topRow.appendChild(killsEl);
        topRow.appendChild(clearBtn);

        sessionEl = document.createElement("div");
        sessionEl.style.fontSize = "11px";
        sessionEl.style.fontWeight = "normal";
        sessionEl.style.lineHeight = "1.4";

        board.appendChild(topRow);
        board.appendChild(sessionEl);

        board.addEventListener("click", toggleTracking);

        const wrapper = document.createElement("div");
        wrapper.style.textAlign = "center";
        wrapper.appendChild(board);

        countdown.insertBefore(wrapper, bombMsg);
        applyVisibility();
        updateBoard();
    }

    function animateScore() {
        if (!board) return;
        board.style.transform = "scale(1.12)";
        board.style.filter = "brightness(1.25)";
        setTimeout(() => {
            board.style.transform = "scale(1)";
            board.style.filter = "brightness(1)";
        }, 180);
    }

    function updateBoard() {
        if (!board || !scoreEl || !killsEl || !sessionEl) return;

        if (!tracking && (wins > 0 || losses > 0) && wins !== losses) {
            const wColor = wins > losses ? "#DEDA31" : "white";
            const lColor = losses > wins ? "#DEDA31" : "white";
            scoreEl.innerHTML =
                `<span style="color:${wColor}">${wins}</span>` +
                ` - ` +
                `<span style="color:${lColor}">${losses}</span>`;
        } else {
            scoreEl.textContent = `${wins} - ${losses}`;
        }

        killsEl.innerHTML = `<span style="font-size:14px">⌖</span> ${kills}`;

        let html = "";
        if (startTime) {
            html += `<div style="color:#4ADE80">▶ ${formatTime(startTime)} — ${startScore}</div>`;
        }
        if (stopTime) {
            html += `<div style="color:#F87171">■ ${formatTime(stopTime)} — ${stopScore}</div>`;
        }
        sessionEl.innerHTML = html;

        animateScore();
        save();
    }

    function applyVisibility() {
        if (!board || !killsEl) return;
        if (visState === 0) {
            board.style.opacity = "1";
            board.style.pointerEvents = "auto";
            killsEl.style.display = "inline-flex";
        } else if (visState === 1) {
            board.style.opacity = "1";
            board.style.pointerEvents = "auto";
            killsEl.style.display = "none";
        } else {
            board.style.opacity = "0";
            board.style.pointerEvents = "none";
        }
    }

    function maybeCount(text) {
        if (!tracking) return;
        const t = (text || "").trim().toLowerCase();
        if (!t) return;

        if (t.includes("you") && t.includes("win") && t !== lastCounted) {
            wins++;
            lastCounted = t;
            updateBoard();
        } else if (t.includes("you") && t.includes("lose") && t !== lastCounted) {
            losses++;
            lastCounted = t;
            updateBoard();
        }
    }

    function maybeCountKill(text) {
        if (!tracking) return;
        const t = (text || "").trim().toLowerCase();
        if (!t) return;

        if ((t.includes("you killed") || t.includes("you get the kill")) && t !== lastKillCounted) {
            kills++;
            lastKillCounted = t;
            updateBoard();
        }
    }

    new MutationObserver(() => {
        insertBoard();
        const userInfo = document.querySelector(".user-info");
        if (userInfo) maybeCount(userInfo.textContent);
        const infos = document.querySelectorAll("#chat-history .info");
        if (infos.length > 0) maybeCountKill(infos[infos.length - 1].textContent);
    }).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    document.addEventListener("keydown", (e) => {
        if (!e.shiftKey && e.key.toLowerCase() === "h") {
            visState = (visState + 1) % 3;
            applyVisibility();
            save();
        }

        if (e.shiftKey && e.key.toLowerCase() === "s") {
            toggleTracking();
        }

        if (e.shiftKey && e.key.toLowerCase() === "c") {
            clearBoard();
        }
    });

})();
