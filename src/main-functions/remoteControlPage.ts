// The phone remote's control page, served verbatim by remoteControlServer at
// every path. It lives here as a template-string constant (rather than a file
// on disk) so it bundles straight into the main process with no packaging or
// path-resolution concerns, and so the server has nothing to traverse.
//
// It is deliberately self-contained: plain HTML, CSS, and vanilla JS with no
// external requests, no CDN, and no fonts, so it works fully offline on a phone
// that has only the venue's LAN. The UI is icon- and number-led so language is
// a non-issue for v1; the few text labels (the on-air screen names) are English
// only for now.
//
// Note on escaping: the inline <script> below avoids backticks and ${...} on
// purpose, using string concatenation instead, so nothing inside it can clash
// with this outer template literal. The single deliberate exception is the
// WATCHDOG_MS interpolation, which bakes REMOTE_WATCHDOG_MS in at build time.

// How often the server sends every phone an application-level heartbeat.
// Defined here (and imported by remoteControlServer) so the page's watchdog is
// always derived from the interval the server actually uses.
export const REMOTE_HEARTBEAT_INTERVAL_MS = 5000;

// How long the page waits without any message (heartbeat or state) before it
// treats the socket as half-open and reconnects: two and a half heartbeats,
// so one late or lost beat on congested venue Wi-Fi never trips it, but a
// dead connection is noticed in seconds rather than the better part of a
// minute.
export const REMOTE_WATCHDOG_MS = Math.round(
  REMOTE_HEARTBEAT_INTERVAL_MS * 2.5
);

export const REMOTE_CONTROL_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    />
    <meta name="theme-color" content="#0b0f16" />
    <title>PlayOverlay Remote</title>
    <style>
      :root {
        --bg: #0b0f16;
        --panel: #161c27;
        --panel-2: #1f2735;
        --text: #f4f6fb;
        --muted: #93a0b5;
        --accent: #4f7cff;
        --home: #cc0000;
        --away: #1746c8;
        --danger: #b91c1c;
        --ok: #16a34a;
      }
      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--text);
        font-family:
          system-ui,
          -apple-system,
          Segoe UI,
          Roboto,
          sans-serif;
        min-height: 100%;
      }
      body {
        padding: env(safe-area-inset-top) env(safe-area-inset-right)
          env(safe-area-inset-bottom) env(safe-area-inset-left);
      }
      .wrap {
        max-width: 560px;
        margin: 0 auto;
        padding: 16px;
      }
      .status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--muted);
        margin-bottom: 12px;
        min-height: 20px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--muted);
        flex: 0 0 auto;
      }
      .dot.ok {
        background: var(--ok);
      }
      .dot.bad {
        background: var(--danger);
      }
      h1 {
        font-size: 18px;
        margin: 0 0 16px;
        font-weight: 700;
      }
      .hidden {
        display: none !important;
      }
      .notice {
        background: var(--panel);
        border-left: 4px solid var(--danger);
        border-radius: 10px;
        padding: 12px 14px;
        margin: 0 0 16px;
        font-size: 15px;
      }
      /* Pairing screen */
      .pin-display {
        letter-spacing: 10px;
        font-size: 34px;
        text-align: center;
        padding: 16px;
        background: var(--panel);
        border-radius: 14px;
        margin-bottom: 16px;
        min-height: 34px;
        font-variant-numeric: tabular-nums;
      }
      .pad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .pad button,
      .btn {
        border: 0;
        border-radius: 14px;
        background: var(--panel-2);
        color: var(--text);
        font-size: 26px;
        font-weight: 600;
        padding: 20px 0;
        cursor: pointer;
        user-select: none;
      }
      .pad button:active,
      .btn:active {
        background: var(--accent);
      }
      /* Disabled while disconnected, before the first snapshot after
         (re)pairing, during a pairing cooldown, and (for Pause/Resume) when
         no phase is running: a tap there would do nothing, so it must look
         like it. */
      .pad button:disabled,
      .btn:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .pad button:disabled:active,
      .btn:disabled:active,
      .btn.toggle:disabled {
        background: var(--panel-2);
      }
      .err {
        color: #fca5a5;
        font-size: 14px;
        text-align: center;
        margin-top: 12px;
        min-height: 18px;
      }
      /* Control screen */
      .scoreboard {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .team {
        background: var(--panel);
        border-radius: 16px;
        padding: 14px;
        text-align: center;
      }
      .team .abbr {
        font-size: 15px;
        font-weight: 700;
        color: var(--muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .team.home .abbr {
        color: #ff8a8a;
      }
      .team.away .abbr {
        color: #9db4ff;
      }
      .team .num {
        font-size: 60px;
        font-weight: 800;
        line-height: 1;
        margin: 8px 0;
        font-variant-numeric: tabular-nums;
      }
      .score-btns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .score-btns .btn {
        font-size: 30px;
        padding: 14px 0;
      }
      .clock {
        background: var(--panel);
        border-radius: 16px;
        padding: 16px;
        text-align: center;
        margin-bottom: 16px;
      }
      .clock .time {
        font-size: 46px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: 2px;
      }
      .clock .phase {
        color: var(--muted);
        font-size: 13px;
        min-height: 16px;
        margin-top: 2px;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .btn.wide {
        font-size: 18px;
        padding: 18px 0;
      }
      .btn.toggle {
        background: var(--ok);
      }
      .btn.toggle.running {
        background: var(--danger);
      }
      .section-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--muted);
        margin: 0 0 8px;
      }
      .screens {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .btn.screen {
        font-size: 16px;
        padding: 16px 0;
        background: var(--panel-2);
      }
      .btn.screen.active {
        background: var(--accent);
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="status">
        <span class="dot" id="dot"></span>
        <span id="statusText">Connecting...</span>
      </div>

      <section id="pairView">
        <h1>Enter PIN</h1>
        <div class="pin-display" id="pinDisplay"></div>
        <div class="pad">
          <button data-key="1">1</button>
          <button data-key="2">2</button>
          <button data-key="3">3</button>
          <button data-key="4">4</button>
          <button data-key="5">5</button>
          <button data-key="6">6</button>
          <button data-key="7">7</button>
          <button data-key="8">8</button>
          <button data-key="9">9</button>
          <button data-key="clear">C</button>
          <button data-key="0">0</button>
          <button data-key="back">&#9003;</button>
        </div>
        <div class="err" id="pairError"></div>
      </section>

      <section id="controlView" class="hidden">
        <p class="notice hidden" id="restoreNotice">
          The laptop is offering to restore the match. Restore it there (or
          dismiss it) to use the remote.
        </p>
        <div class="scoreboard">
          <div class="team home">
            <div class="abbr" id="homeAbbr">HOME</div>
            <div class="num" id="homeScore">0</div>
            <div class="score-btns">
              <button class="btn" data-cmd="homeGoalRemove">&minus;</button>
              <button class="btn" data-cmd="homeGoal">+</button>
            </div>
          </div>
          <div class="team away">
            <div class="abbr" id="awayAbbr">AWAY</div>
            <div class="num" id="awayScore">0</div>
            <div class="score-btns">
              <button class="btn" data-cmd="awayGoalRemove">&minus;</button>
              <button class="btn" data-cmd="awayGoal">+</button>
            </div>
          </div>
        </div>

        <div class="clock">
          <div class="time" id="clockTime">--:--</div>
          <div class="phase" id="clockPhase"></div>
        </div>

        <div class="row">
          <button
            class="btn toggle wide"
            id="toggleClock"
            data-cmd="toggleClock"
            disabled
          >
            Pause
          </button>
          <button class="btn wide" data-cmd="nextPhase">Next phase</button>
        </div>

        <p class="section-label">On-air screen</p>
        <div class="screens" id="screens">
          <button class="btn screen" data-screen="scoreBug">Score bug</button>
          <button class="btn screen" data-screen="matchTitle">Match title</button>
          <button class="btn screen" data-screen="scoreboard">Scoreboard</button>
          <button class="btn screen" data-screen="penalties">Penalties</button>
          <button class="btn screen" data-screen="endScreen">End screen</button>
          <button class="btn screen" data-screen="none">Blank</button>
        </div>
      </section>
    </div>

    <script>
      (function () {
        var TOKEN_KEY = 'playoverlayRemoteResumeToken';
        // No heartbeat or state for this long means a half-open socket; see
        // REMOTE_WATCHDOG_MS.
        var WATCHDOG_MS = ${REMOTE_WATCHDOG_MS};

        var pin = '';
        // The resume token from the last successful pairing, presented on
        // every reconnect so a dropped socket recovers without the PIN. Kept
        // in sessionStorage so it also survives the phone reloading the tab
        // (mobile browsers do this to background tabs), but not a new tab.
        var resumeToken = loadToken();
        var ws = null;
        var paired = false;
        // True once a state snapshot has arrived on the current paired socket.
        // Controls stay disabled until then so a tap is never sent against a
        // stale score or into a socket the server hasn't finished pairing.
        var ready = false;
        var lastState = null;
        var lastMessageAt = 0;
        var reconnectDelay = 1000;
        var reconnectTimer = null;
        var watchdogTimer = null;
        var cooldownTimer = null;
        var cooldownUntil = 0;

        var dot = document.getElementById('dot');
        var statusText = document.getElementById('statusText');
        var pairView = document.getElementById('pairView');
        var controlView = document.getElementById('controlView');
        var pinDisplay = document.getElementById('pinDisplay');
        var pairError = document.getElementById('pairError');

        function loadToken() {
          try {
            return window.sessionStorage.getItem(TOKEN_KEY);
          } catch (e) {
            return null;
          }
        }

        function saveToken(token) {
          try {
            if (token) {
              window.sessionStorage.setItem(TOKEN_KEY, token);
            } else {
              window.sessionStorage.removeItem(TOKEN_KEY);
            }
          } catch (e) {
            /* storage unavailable: the in-memory token still works */
          }
        }

        function setStatus(text, state) {
          statusText.textContent = text;
          dot.className = 'dot' + (state ? ' ' + state : '');
        }

        function renderPin() {
          var masked = '';
          for (var i = 0; i < pin.length; i++) {
            masked += '\\u2022';
          }
          pinDisplay.textContent = masked;
        }

        function showControls(show) {
          if (show) {
            pairView.classList.add('hidden');
            controlView.classList.remove('hidden');
          } else {
            controlView.classList.add('hidden');
            pairView.classList.remove('hidden');
          }
        }

        // Enables the control buttons only while they can actually do
        // something, and labels the clock button with what a tap will do.
        // toggleClock only pauses or resumes a running phase, so with no phase
        // running it is disabled and Next phase is the way to kick off.
        // While the laptop is offering to restore a match, the server refuses
        // commands (a goal would replace the recovered score), so the controls
        // are disabled and the notice says why.
        function updateControls() {
          var awaitingRestore = !!(lastState && lastState.awaitingRestore);
          document
            .getElementById('restoreNotice')
            .classList.toggle('hidden', !(paired && ready && awaitingRestore));
          var live = paired && ready && !awaitingRestore;
          var buttons = controlView.querySelectorAll('button');
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].disabled = !live;
          }

          var time = (lastState && lastState.time) || {};
          var phaseRunning = time.matchPhase != null;
          var isPaused = time.paused === true;
          var toggle = document.getElementById('toggleClock');
          toggle.textContent = phaseRunning && isPaused ? 'Resume' : 'Pause';
          if (phaseRunning && !isPaused) {
            toggle.classList.add('running');
          } else {
            toggle.classList.remove('running');
          }
          toggle.disabled = !live || !phaseRunning;
        }

        function applyState(s) {
          if (!s) return;
          lastState = s;
          var settings = s.matchSettings || {};
          document.getElementById('homeAbbr').textContent =
            settings.homeTeamNameAbbreviated || 'HOME';
          document.getElementById('awayAbbr').textContent =
            settings.awayTeamNameAbbreviated || 'AWAY';
          var scores = s.scores || {};
          document.getElementById('homeScore').textContent =
            scores.homeTeam == null ? '0' : String(scores.homeTeam);
          document.getElementById('awayScore').textContent =
            scores.awayTeam == null ? '0' : String(scores.awayTeam);

          var time = s.time || {};
          document.getElementById('clockTime').textContent = time.time || '--:--';
          var phaseText = '';
          if (time.matchPhase != null) {
            phaseText = time.paused === true ? 'Paused' : 'Running';
          } else {
            phaseText = 'Stopped. Tap Next phase to start.';
          }
          document.getElementById('clockPhase').textContent = phaseText;

          var matchState = s.matchState || {};
          var active = matchState.displayScreen;
          var screenButtons = document.querySelectorAll('#screens .screen');
          for (var i = 0; i < screenButtons.length; i++) {
            var btn = screenButtons[i];
            if (btn.getAttribute('data-screen') === active) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          }
        }

        function setPadEnabled(enabled) {
          var keys = document.querySelectorAll('.pad button');
          for (var i = 0; i < keys.length; i++) {
            keys[i].disabled = !enabled;
          }
        }

        function clearCooldown() {
          if (cooldownTimer) clearInterval(cooldownTimer);
          cooldownTimer = null;
          cooldownUntil = 0;
          setPadEnabled(true);
        }

        function renderCooldown() {
          var remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
          if (remaining <= 0) {
            clearCooldown();
            pairError.textContent = 'You can try the PIN again now.';
            return;
          }
          pairError.textContent =
            'Too many attempts. Wait ' +
            remaining +
            (remaining === 1 ? ' second' : ' seconds') +
            ', then try again.';
        }

        // The server refuses this device's PIN attempts for a while after
        // several wrong ones. Lock the keypad and count down, so the operator
        // knows exactly when to try again instead of typing into a void.
        function startCooldown(seconds) {
          var secs = Number(seconds);
          if (!(secs > 0)) secs = 30;
          if (cooldownTimer) clearInterval(cooldownTimer);
          cooldownUntil = Date.now() + secs * 1000;
          setPadEnabled(false);
          renderCooldown();
          cooldownTimer = setInterval(renderCooldown, 1000);
        }

        function send(obj) {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(obj));
          }
        }

        function sendCommand(type) {
          if (!paired || !ready) return;
          send({ type: type });
        }

        function sendScreen(screen) {
          if (!paired || !ready) return;
          send({ type: 'setScreen', screen: screen });
        }

        function feedWatchdog() {
          lastMessageAt = Date.now();
          if (watchdogTimer) clearTimeout(watchdogTimer);
          watchdogTimer = setTimeout(reconnectNow, WATCHDOG_MS);
        }

        // Detaches and closes the current socket. Handlers go first, so a
        // half-open socket's late onclose (which can take a minute or more
        // to arrive) can't schedule a second, competing reconnect.
        function dropSocket() {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          watchdogTimer = null;
          if (!ws) return;
          var old = ws;
          ws = null;
          old.onopen = null;
          old.onmessage = null;
          old.onclose = null;
          old.onerror = null;
          try {
            old.close();
          } catch (e) {
            /* ignore */
          }
        }

        function markDisconnected() {
          paired = false;
          ready = false;
          updateControls();
          setStatus('Disconnected, reconnecting...', 'bad');
        }

        // The watchdog fired (or the phone just woke with a stale socket):
        // stop trusting the socket and reconnect straight away rather than
        // waiting for the OS to notice the connection is dead.
        function reconnectNow() {
          dropSocket();
          markDisconnected();
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = null;
          connect();
        }

        function scheduleReconnect() {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, reconnectDelay);
          // Exponential backoff capped at 10s so a long outage doesn't hammer
          // the server but recovery is still quick.
          reconnectDelay = Math.min(reconnectDelay * 2, 10000);
        }

        function handleUnauthorized(msg) {
          paired = false;
          ready = false;
          // Always start the next attempt from an empty PIN. Leaving the
          // rejected digits in place would make the next keypress resend the
          // same wrong PIN.
          pin = '';
          renderPin();
          showControls(false);
          updateControls();
          setStatus('Not paired', 'bad');
          if (msg.reason === 'resumeRejected') {
            // The saved pairing is from before PlayOverlay restarted its
            // remote (which always mints a new PIN). Not a wrong PIN, just
            // ask for the new one.
            resumeToken = null;
            saveToken(null);
            pairError.textContent =
              'PlayOverlay has a new PIN. Enter it to reconnect.';
          } else if (msg.reason === 'cooldown') {
            startCooldown(msg.retryAfterSeconds);
          } else {
            pairError.textContent =
              'Wrong PIN. Check the PIN shown in PlayOverlay and try again.';
          }
        }

        function handleMessage(data) {
          var msg;
          try {
            msg = JSON.parse(data);
          } catch (e) {
            return;
          }
          if (!msg || typeof msg !== 'object') return;

          if (msg.type === 'heartbeat') {
            return;
          }
          if (msg.type === 'paired') {
            paired = true;
            ready = false;
            if (typeof msg.token === 'string' && msg.token) {
              resumeToken = msg.token;
              saveToken(msg.token);
            }
            pin = '';
            renderPin();
            clearCooldown();
            pairError.textContent = '';
            showControls(true);
            updateControls();
            // The server sends a snapshot straight after the ack; controls
            // enable when it lands.
            setStatus('Syncing...', '');
            return;
          }
          if (msg.type === 'unauthorized') {
            handleUnauthorized(msg);
            return;
          }
          if (msg.type === 'state') {
            applyState(msg.payload);
            if (paired && !ready) {
              ready = true;
              setStatus('Connected', 'ok');
            }
            updateControls();
            return;
          }
        }

        function connect() {
          reconnectTimer = null;
          setStatus('Connecting...', '');
          var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
          var socket;
          try {
            socket = new WebSocket(proto + location.host);
          } catch (e) {
            markDisconnected();
            scheduleReconnect();
            return;
          }
          ws = socket;
          // Armed before the socket opens too, so a connection attempt that
          // hangs (the laptop's Wi-Fi went away) is abandoned and retried.
          feedWatchdog();

          socket.onopen = function () {
            reconnectDelay = 1000;
            feedWatchdog();
            if (resumeToken) {
              // Re-pair with the token so a dropped socket recovers without
              // re-prompting the operator for the PIN.
              setStatus('Reconnecting...', '');
              send({ type: 'resume', token: resumeToken });
            } else {
              setStatus('Enter the PIN shown in PlayOverlay', '');
              // A PIN finished while the socket was down goes out now.
              if (pin.length === 6 && !cooldownTimer) {
                send({ type: 'pair', pin: pin });
              }
            }
          };

          socket.onmessage = function (event) {
            feedWatchdog();
            handleMessage(event.data);
          };

          socket.onclose = function () {
            dropSocket();
            markDisconnected();
            scheduleReconnect();
          };

          socket.onerror = function () {
            // onclose handles the reconnect; just make sure the socket is torn
            // down so we don't leak a half-open connection.
            try {
              socket.close();
            } catch (e) {
              /* ignore */
            }
          };
        }

        // Pairing keypad.
        document.querySelector('.pad').addEventListener('click', function (e) {
          var key = e.target.getAttribute('data-key');
          if (!key || cooldownTimer) return;
          if (key === 'clear') {
            pin = '';
          } else if (key === 'back') {
            pin = pin.slice(0, -1);
          } else if (pin.length < 6) {
            pin += key;
          } else {
            return;
          }
          pairError.textContent = '';
          renderPin();
          if (pin.length === 6) {
            send({ type: 'pair', pin: pin });
          }
        });

        // Control buttons (score, clock, phase).
        document.querySelectorAll('[data-cmd]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            sendCommand(btn.getAttribute('data-cmd'));
          });
        });

        // On-air screen switcher.
        document.querySelectorAll('[data-screen]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            sendScreen(btn.getAttribute('data-screen'));
          });
        });

        // Phones freeze background tabs, so after the screen wakes the socket
        // may be long dead while its timers haven't caught up. Check straight
        // away instead of leaving a stale "Connected" up for the operator.
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState !== 'visible') return;
          if (!ws || Date.now() - lastMessageAt > WATCHDOG_MS) {
            reconnectNow();
          }
        });

        renderPin();
        updateControls();
        // With a saved pairing, stay on the (disabled) controls while the
        // resume goes through rather than flashing the PIN screen.
        showControls(!!resumeToken);
        connect();
      })();
    </script>
  </body>
</html>
`;
