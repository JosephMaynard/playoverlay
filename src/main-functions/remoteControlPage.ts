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
// with this outer template literal.
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
          <button class="btn toggle wide" id="toggleClock" data-cmd="toggleClock">
            Start / Stop
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
        var pin = '';
        var pairedPin = null;
        var ws = null;
        var reconnectDelay = 1000;
        var reconnectTimer = null;
        var watchdogTimer = null;
        // Server heartbeats every 15s; tolerate a couple of misses before
        // treating the socket as dead and forcing a reconnect.
        var WATCHDOG_MS = 45000;

        var dot = document.getElementById('dot');
        var statusText = document.getElementById('statusText');
        var pairView = document.getElementById('pairView');
        var controlView = document.getElementById('controlView');
        var pinDisplay = document.getElementById('pinDisplay');
        var pairError = document.getElementById('pairError');

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

        function feedWatchdog() {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          watchdogTimer = setTimeout(function () {
            // No heartbeat or state for too long: assume a half-open socket
            // and reconnect rather than sit silently disconnected.
            if (ws) {
              try {
                ws.close();
              } catch (e) {
                /* ignore */
              }
            }
          }, WATCHDOG_MS);
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

        function applyState(s) {
          if (!s) return;
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
          var running = time.matchPhase != null && time.paused !== true;
          var phaseText = '';
          if (time.matchPhase != null) {
            phaseText = time.paused === true ? 'Paused' : 'Running';
          } else {
            phaseText = 'Stopped';
          }
          document.getElementById('clockPhase').textContent = phaseText;

          var toggle = document.getElementById('toggleClock');
          if (running) {
            toggle.classList.add('running');
          } else {
            toggle.classList.remove('running');
          }

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

        function send(obj) {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(obj));
          }
        }

        function sendCommand(type) {
          if (!pairedPin) return;
          send({ type: type });
        }

        function sendScreen(screen) {
          if (!pairedPin) return;
          send({ type: 'setScreen', screen: screen });
        }

        function connect() {
          setStatus('Connecting...', '');
          var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
          ws = new WebSocket(proto + location.host);

          ws.onopen = function () {
            reconnectDelay = 1000;
            feedWatchdog();
            // If we were already paired this session, re-pair automatically so
            // a dropped socket recovers without re-prompting the operator.
            if (pairedPin) {
              setStatus('Reconnecting...', '');
              send({ type: 'pair', pin: pairedPin });
            } else {
              setStatus('Enter the PIN shown in PlayOverlay', '');
            }
          };

          ws.onmessage = function (event) {
            feedWatchdog();
            var msg;
            try {
              msg = JSON.parse(event.data);
            } catch (e) {
              return;
            }
            if (!msg || typeof msg !== 'object') return;

            if (msg.type === 'heartbeat') {
              return;
            }
            if (msg.type === 'paired') {
              pairedPin = pin || pairedPin;
              pairError.textContent = '';
              showControls(true);
              setStatus('Connected', 'ok');
              return;
            }
            if (msg.type === 'unauthorized') {
              if (pairedPin) {
                // A re-pair after reconnect failed (PIN changed because the
                // app restarted). Drop back to the PIN screen.
                pairedPin = null;
                pin = '';
                renderPin();
                showControls(false);
              }
              pairError.textContent = 'Wrong PIN, or too many attempts. Try again.';
              setStatus('Not paired', 'bad');
              return;
            }
            if (msg.type === 'state') {
              applyState(msg.payload);
              return;
            }
          };

          ws.onclose = function () {
            if (watchdogTimer) clearTimeout(watchdogTimer);
            setStatus('Disconnected, reconnecting...', 'bad');
            scheduleReconnect();
          };

          ws.onerror = function () {
            // onclose handles the reconnect; just make sure the socket is torn
            // down so we don't leak a half-open connection.
            if (ws) {
              try {
                ws.close();
              } catch (e) {
                /* ignore */
              }
            }
          };
        }

        function scheduleReconnect() {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, reconnectDelay);
          // Exponential backoff capped at 10s so a long outage doesn't hammer
          // the server but recovery is still quick.
          reconnectDelay = Math.min(reconnectDelay * 2, 10000);
        }

        // Pairing keypad.
        document.querySelector('.pad').addEventListener('click', function (e) {
          var key = e.target.getAttribute('data-key');
          if (!key) return;
          if (key === 'clear') {
            pin = '';
          } else if (key === 'back') {
            pin = pin.slice(0, -1);
          } else if (pin.length < 6) {
            pin += key;
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

        renderPin();
        connect();
      })();
    </script>
  </body>
</html>
`;
