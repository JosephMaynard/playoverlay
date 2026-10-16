# Website images

Every image on the site that isn't one of the three real screenshots in
`public/screenshots/` is an **image slot**. A slot shows a labelled placeholder
until a file with its name exists in `public/images/`, then shows that file
instead. The check happens when the page is built, so add the file and rebuild
(or restart `npm run dev`).

## How to add an image

1. Make the image at the size listed below (or larger, at the same aspect
   ratio). The site crops to the slot's ratio, so a different ratio loses its
   edges.
2. Save it as `public/images/<slot name>.<ext>`. Accepted extensions, in order
   of preference: `.webp`, `.avif`, `.jpg`, `.jpeg`, `.png`. Use JPEG or WebP
   for photos and PNG for screenshots.
3. Keep each file under about 1 MB. `next/image` resizes and compresses for
   each screen, but a smaller source builds faster.
4. Rebuild and check the page. The alt text for each slot is in
   `src/lib/image-slots.ts`. Update it if your image shows something
   different.

## Two kinds of slot

- **Photo slots** (1 to 5) are scenes: a pitch, a table of kit, a clubhouse
  TV. Generate these with ChatGPT or Gemini using the prompt given, then
  paste a real PlayOverlay screenshot onto any screen in the picture. The
  prompts tell the generator to leave screens blank because AI image tools
  invent fake, unreadable interfaces.
- **Screenshot slots** (6 to 14) show the app itself. These must be real
  screenshots: a generated picture of the interface would be wrong in the
  details people use to follow the guide. Each has capture instructions
  instead of a prompt.

For all screenshots of the app's output, use the demo teams already in the
existing screenshots (Winchester F.C. "WIN" in red, Romsey United "ROM" in
blue) so the site stays consistent.

## Summary

| # | Slot (file name) | Size | Ratio | Kind | Used on | Status |
| - | ---------------- | ---- | ----- | ---- | ------- | ------ |
| 1 | `hero-match` | 2400 × 1350 | 16:9 | Photo + composite | Home hero | Needed |
| 2 | `setup-atem` | 1600 × 1200 | 4:3 | Photo + composite | Home output options (cropped to 16:10), Output setup | Needed |
| 3 | `phone-remote` | 1200 × 1500 | 4:5 | Photo + composite | Home features, Phone remote | Needed |
| 4 | `venue-scoreboard` | 1920 × 1080 | 16:9 | Photo + composite | Home output options (cropped to 16:10), Output setup | Needed |
| 5 | `stream-deck` | 1600 × 1200 | 4:3 | Photo + composite | Keyboard shortcuts and Stream Deck | Needed |
| 6 | `obs-browser-source` | 1920 × 1200 | 16:10 | Screenshot | Home output options, Output setup | Needed |
| 7 | `match-settings` | 1600 × 1000 | 16:10 | Screenshot | Match settings, Line-ups | Done: `match-settings.png` |
| 8 | `screen-match-title` | 2560 × 1440 | 16:9 | Screenshot | Screens | Done: `screen-match-title.png` |
| 9 | `screen-goal-banner` | 2560 × 1440 | 16:9 | Screenshot | Home features, Running a match | Done: `screen-goal-banner.png` |
| 10 | `screen-end-screen` | 2560 × 1440 | 16:9 | Screenshot | Screens | Done: `screen-end-screen.png` |
| 11 | `screen-home-lineup` | 2560 × 1440 | 16:9 | Screenshot | Home features, Line-ups | Done: `screen-home-lineup.png` |
| 12 | `screen-away-lineup` | 2560 × 1440 | 16:9 | Screenshot | Screens | Done: `screen-away-lineup.png` |
| 13 | `scorer-picker` | 1600 × 1000 | 16:10 | Screenshot | Line-ups | Done: `scorer-picker.png` |
| 14 | `rotation-panel` | 1600 × 1000 | 16:10 | Screenshot | Line-ups | Done: `rotation-panel.png` |

The three files in `public/screenshots/` (`dashboard.png` at 1600 × 1000,
`score-bug.png` and `scoreboard.png` at 2560 × 1440) were recaptured with the
line-ups feature: the dashboard shows the Home Line-up and Away Line-up
buttons and the Rotate screens panel. All the captured screenshots show
Winchester F.C. 2-1 Romsey United in the second half.

To replace a finished screenshot, recapture it the same way and save it over
the existing file. The capture instructions below are kept for that.

---

## 1. `hero-match`

- **Size:** 2400 × 1350 px, 16:9
- **Used on:** the home page hero, full width. This is the first image anyone
  sees.
- **Should show:** a frame from a grassroots football stream, as a viewer
  would see it, with PlayOverlay's score bug keyed over the top-left corner.
  It should look like a real community match, not a professional stadium.
- **How to make it:** generate the match frame with the prompt below, then
  paste the score bug on top. Crop the bug from
  `public/screenshots/score-bug.png` (the red, black and blue bar at the top
  left; remove the blue background), scale it so it is about 25% of the
  image width, and place it about 50 px in from the top and left edges, the
  same position as in the real output.

**Prompt:**

```
A photorealistic wide shot of a grassroots amateur football (soccer) match in England, filmed from a raised camera position on the touchline at about head height plus two metres, as a live stream would be. Overcast UK afternoon, flat grey sky, soft even light, no harsh shadows. Slightly worn grass pitch with white painted lines, a metal rail around the pitch, a few spectators in coats standing along the far side, bare trees and a low clubhouse building in the background. Two teams in action in midfield: one team in plain red shirts and black shorts, the other in plain royal blue shirts and white shorts, no logos, no sponsor text, no numbers legible. A referee in black. Natural video look, 1/500 shutter, slight compression like a 1080p stream, not cinematic, no lens flare. Leave the top-left corner of the frame (roughly the top 15% and left 35%) clear of players and busy detail, with only sky, trees or the far touchline there. No text, no graphics, no watermarks, no scoreboard. 16:9 landscape, 2400 by 1350 pixels.
```

## 2. `setup-atem`

- **Size:** 1600 × 1200 px, 4:3. On the home page it is cropped to 16:10,
  so keep the important part away from the top and bottom edges.
- **Used on:** the home page output options ("Vision mixer over HDMI") and
  the Output setup guide.
- **Should show:** the touchline kit for the chroma key route: a laptop
  running PlayOverlay, a Blackmagic ATEM Mini, and a camera on a tripod, with
  HDMI cables connecting the camera and the laptop to the ATEM.
- **How to make it:** generate with the prompt, then paste
  `public/screenshots/dashboard.png` onto the laptop screen (use a perspective
  or distort tool so it matches the screen's angle). A real photo of the
  actual kit is even better if you can take one.

**Prompt:**

```
A photorealistic photo of a small live-streaming setup on a folding table at the side of a grassroots football pitch in England, overcast afternoon, soft natural light. On the table: an open silver laptop, angled towards the camera, with its screen completely blank and plain white (it will be replaced later); next to it a small black video switcher about the size of a hardback book with a row of square buttons on top (similar in shape to a Blackmagic ATEM Mini, but with no visible logos or brand names); black HDMI cables running from the laptop and from a video camera into the back of the switcher. Behind the table, a compact video camera on a tripod pointing at the pitch, which is out of focus in the background with players in red and blue. A flask and a clipboard on the table for realism. Shot at eye level, 35mm lens, shallow depth of field, focus on the switcher and laptop. No text, no logos, no people's faces. 4:3 landscape, 1600 by 1200 pixels.
```

## 3. `phone-remote`

- **Size:** 1200 × 1500 px, 4:5 portrait
- **Used on:** the home page features ("Run it from the touchline") and the
  Phone remote guide.
- **Should show:** a hand holding a phone at the touchline, with the
  PlayOverlay phone remote on screen and the match out of focus behind.
- **How to make it:** generate with the prompt, then paste a real screenshot
  of the phone remote onto the phone screen. To get one, turn the remote on
  in **System Settings → Phone Remote**, open it on your phone, pair, and take
  a screenshot on the phone during a test match with a non-zero score.

**Prompt:**

```
A photorealistic close-up of a person's hand holding a modern smartphone upright at the side of a grassroots football pitch in England, overcast UK afternoon, soft grey light. The phone is held at chest height facing the viewer, screen completely blank and plain white with no reflections (it will be replaced later). The person wears a dark waterproof jacket sleeve; only the hand and forearm are visible, no face. Behind, out of focus, a grass pitch with white lines and blurred players in red and blue kits. Natural colours, 50mm lens, shallow depth of field with the phone sharp. No text, no logos, no app interface on the screen. 4:5 portrait, 1200 by 1500 pixels.
```

## 4. `venue-scoreboard`

- **Size:** 1920 × 1080 px, 16:9. On the home page it is cropped to 16:10.
- **Used on:** the home page output options ("Venue scoreboard") and the
  Output setup guide.
- **Should show:** a TV in a community clubhouse showing PlayOverlay's
  spectator scoreboard.
- **How to make it:** generate with the prompt, then paste
  `public/screenshots/scoreboard.png` onto the TV screen, matching its angle.

**Prompt:**

```
A photorealistic photo inside a small grassroots football clubhouse in England on a match day afternoon. A large flat-screen TV is mounted high on a painted brick wall, seen slightly from below and to one side. The TV screen is completely blank and plain white, evenly lit, with no reflections (it will be replaced later). Around it: a wooden bar counter, a noticeboard with pinned papers that are not legible, framed team photos that are too small to make out, a window showing an overcast grey sky and a glimpse of a grass pitch. Warm indoor lighting mixed with cool daylight from the window. Two or three people in coats in the foreground, seen from behind and slightly out of focus, looking up at the TV. No readable text, no logos, no brand names. 16:9 landscape, 1920 by 1080 pixels.
```

## 5. `stream-deck`

- **Size:** 1600 × 1200 px, 4:3
- **Used on:** the Keyboard shortcuts and Stream Deck guide.
- **Should show:** an Elgato Stream Deck next to a laptop running PlayOverlay,
  on the operator's table.
- **How to make it:** generate with the prompt, then paste
  `public/screenshots/dashboard.png` onto the laptop. A real photo of the deck
  running PlayOverlay's buttons is better: the generated keys will be blank.

**Prompt:**

```
A photorealistic close-up of a compact USB control pad with fifteen square backlit keys in a 5 by 3 grid (similar in shape to an Elgato Stream Deck, with no visible brand name) on a folding table next to an open laptop, at the side of a grassroots football pitch, overcast afternoon. The keys glow softly in plain solid colours, red, blue, green and grey, with no icons and no text on them. The laptop screen is completely blank and plain white with no reflections (it will be replaced later). A finger is about to press one of the keys. The pitch is out of focus in the background. 45-degree overhead angle, 50mm lens, shallow depth of field with the keys in focus. No logos, no readable text. 4:3 landscape, 1600 by 1200 pixels.
```

## 6. `obs-browser-source` (screenshot)

- **Size:** 1920 × 1200 px, 16:10
- **Used on:** the home page output options ("OBS browser source") and the
  Output setup guide.
- **Should show:** OBS Studio with PlayOverlay's browser source in a scene,
  the score bug visible over a camera or video source in the OBS preview, and
  the browser source's properties showing the URL `http://127.0.0.1:4750/`.
- **How to capture:**
  1. In PlayOverlay, switch on **System Settings → OBS Browser Source**.
  2. In OBS, make a scene with a camera or a video of a match as the bottom
     source, and a Browser source on top pointed at `http://127.0.0.1:4750/`
     at 1920 × 1080.
  3. Put the score bug on air in PlayOverlay with a non-zero score.
  4. Open the browser source's Properties so the URL is visible, and take a
     screenshot of the OBS window at 1920 × 1200 (or crop to 16:10).

## 7. `match-settings` (screenshot, done)

- **Size:** 1600 × 1000 px, 16:10 (the dashboard window size)
- **Used on:** the Match settings guide, at the top, and the Line-ups guide.
- **Shows:** the Match Settings panel open over the dimmed dashboard, with
  Winchester F.C.'s line-up of 14 numbered players, the **Add player** and
  **Paste a list** buttons, and **Load a saved club** and **Save as club** for
  the away team below.
- **How to capture:** open Match Settings from the people icon on the
  dashboard, fill in the home team's line-up, scroll so the Line-up section
  is in view, and screenshot the whole dashboard window at 1600 × 1000.

## 8. `screen-match-title` (screenshot, done)

- **Size:** 2560 × 1440 px, 16:9 (the same as the existing screenshots)
- **Used on:** the Screens guide.
- **Should show:** the display window with the Match Title screen on air,
  before kick-off: both teams, the venue, the kick-off time and the
  "Starts in" countdown, on the blue key colour.
- **How to capture:** set a kick-off time a few minutes in the future, put
  **Match Title** on air, and screenshot the display window full screen. Take
  it the same way as `public/screenshots/score-bug.png` so they match.

## 9. `screen-goal-banner` (screenshot, done)

- **Size:** 2560 × 1440 px, 16:9
- **Used on:** the home page features ("Every goal logged") and the Running a
  match guide.
- **Shows:** the display window with the score bug and the goal banner on
  air, reading "GOAL Winchester F.C. 9 Ali Smith 23'". The scorer was picked
  from the line-up and the banner brought back with **Show on air**.
- **How to capture:** start the first half, let the clock run a minute or two,
  press **Home Team Scored**, and screenshot the display window while the
  banner is showing. If it disappears too quickly, use **Show on air** next to
  the goal in the Goals panel to bring it back.

## 10. `screen-end-screen` (screenshot, done)

- **Size:** 2560 × 1440 px, 16:9
- **Used on:** the Screens guide.
- **Should show:** the End Screen with a final score and scorer names with
  minutes for both teams, for example "Smith 23', 67'".
- **How to capture:** in a test match, log a few goals with the clock
  running, add scorer names in the Goals panel, stop the clock, put **End
  Screen** on air, and screenshot the display window.

## 11. `screen-home-lineup` (screenshot, done)

- **Size:** 2560 × 1440 px, 16:9
- **Used on:** the home page features ("Line-ups and scorers from the team
  sheet") and the Line-ups guide.
- **Shows:** the Home Line-up screen for Winchester F.C., 14 players in two
  columns with the shirt numbers in the club's red, on the blue key colour.
- **How to capture:** enter more than eleven players for the home team in
  Match Settings, put **Home Line-up** on air, and screenshot the display
  window full screen, the same way as `public/screenshots/score-bug.png`.

## 12. `screen-away-lineup` (screenshot, done)

- **Size:** 2560 × 1440 px, 16:9
- **Used on:** the Screens guide.
- **Shows:** the Away Line-up screen for Romsey United, eleven players in a
  single column with the shirt numbers in the club's blue.
- **How to capture:** as for `screen-home-lineup`, with eleven or fewer away
  players so the single-column layout is shown.

## 13. `scorer-picker` (screenshot, done)

- **Size:** 1600 × 1000 px, 16:10
- **Used on:** the Line-ups guide ("Picking the scorer").
- **Shows:** the dashboard with the Goals panel in view, a scorer being typed
  next to a goal and the hint "Not in the line-up? Just type a name." under
  the field. The preview shows the goal banner with "9 Ali Smith 23'".
- **How to capture:** with both line-ups entered and a few goals logged,
  scroll the dashboard to the Goals panel, click into a scorer field, type a
  couple of letters that match no player, and screenshot the dashboard window.

## 14. `rotation-panel` (screenshot, done)

- **Size:** 1600 × 1000 px, 16:10
- **Used on:** the Line-ups guide ("Rotating screens").
- **Shows:** the dashboard with the **Rotate screens** panel opened under
  Display Controls and its description in view. The screen ticks, **Seconds
  per screen** and **Start automatically at half-time** are below the bottom
  edge of this capture.
- **Better version:** scroll the left column so the whole panel is in view,
  with a few screens ticked, the seconds set and the automatic start switched
  on, and screenshot the dashboard window at 1600 × 1000. Save it over
  `public/images/rotation-panel.png`.
