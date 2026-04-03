# 8BitDo Ultimate 3-Mode Xbox - Gamepad Remapper

A userscript that fixes the broken gamepad mapping for the **8BitDo Ultimate 3-mode Controller for Xbox** when connected via Bluetooth to macOS. Makes the controller work correctly with Xbox Cloud Gaming, browser games, and any web app using the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API).

## The Problem

When connected via Bluetooth to macOS, the 8BitDo Ultimate 3-mode controller:

- Reports as a **non-standard** gamepad (mapping: `""` instead of `"standard"`)
- Has **phantom inputs** (triggers rest at -1 instead of 0, causing constant "up" input)
- Maps buttons to **wrong indices** (RT opens menus, X/Y are swapped, etc.)
- Exposes the **D-pad as a hat switch axis** instead of 4 digital buttons
- Places the **right stick Y-axis** on axis 5 instead of axis 3

This makes the controller unusable on Xbox Cloud Gaming and most browser-based games.

## The Fix

This userscript intercepts the browser's `navigator.getGamepads()` API and remaps the controller's raw HID data to the [W3C Standard Gamepad](https://w3c.github.io/gamepad/#remapping) layout.

## Raw vs Remapped Mapping

### Buttons

| Physical Button | Raw Index | Standard Index | Notes |
|---|---|---|---|
| A | 0 | 0 | |
| B | 1 | 1 | |
| X | 3 | 2 | Shifted |
| Y | 4 | 3 | Shifted |
| LB | 6 | 4 | Shifted |
| RB | 7 | 5 | Shifted |
| LT | Axis 4 (-1 to 1) | 6 (analog 0-1) | Converted from axis to button |
| RT | Axis 3 (-1 to 1) | 7 (analog 0-1) | Converted from axis to button |
| View | 10 | 8 | |
| Menu | 11 | 9 | |
| L3 (Left Stick Click) | 13 | 10 | Also triggered by left back paddle |
| R3 (Right Stick Click) | 14 | 11 | Also triggered by right back paddle |
| D-pad Up | Axis 9 = -1.000 | 12 | Converted from hat switch |
| D-pad Down | Axis 9 = 0.143 | 13 | Converted from hat switch |
| D-pad Left | Axis 9 = 0.714 | 14 | Converted from hat switch |
| D-pad Right | Axis 9 = -0.429 | 15 | Converted from hat switch |
| Share | 15 | 16 | Mapped as Xbox/Guide button |

### Axes

| Axis | Raw Index | Standard Index |
|---|---|---|
| Left Stick X | 0 | 0 |
| Left Stick Y | 1 | 1 |
| Right Stick X | 2 | 2 |
| Right Stick Y | 5 | 3 |

### Back Paddles

The two back paddles are mapped as duplicates of L3/R3 (matching Xbox Elite controller behavior):

- **Left paddle** (raw button 5) -> L3 (standard button 10)
- **Right paddle** (raw button 2) -> R3 (standard button 11)

### Buttons Intercepted by macOS

The following buttons are captured by macOS at the system level and never reach the browser:

- **Xbox button** - Opens Apple Games / Game Center
- **Star button** - Intercepted by macOS Game Controller framework
- **Profile button** - Intercepted by macOS Game Controller framework

## Installation

### Option 1: Tampermonkey / Violentmonkey (Recommended)

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox/Safari) or [Violentmonkey](https://violentmonkey.github.io/) (Chrome/Edge/Firefox)
2. Click the link below to install the script:

   **[Install 8bitdo-gamepad-remapper.user.js](https://raw.githubusercontent.com/leandrosalgado/8bitdo-ultimate-macos-remapper/main/8bitdo-gamepad-remapper.user.js)**

3. Click "Install" when prompted
4. Done! The script runs automatically on all pages

### Option 2: Manual Installation

1. Install Tampermonkey or Violentmonkey
2. Open the extension dashboard
3. Click the **+** tab to create a new script
4. Copy and paste the contents of [`8bitdo-gamepad-remapper.user.js`](8bitdo-gamepad-remapper.user.js)
5. Save (Ctrl+S / Cmd+S)

## Compatibility

- **Controller**: 8BitDo Ultimate 3-mode Controller for Xbox (Vendor: `2dc8`, Product: `901b`)
- **Connection**: Bluetooth (BLE) on macOS
- **OS**: macOS 15.2+ (Sequoia) — may also work on older versions
- **Browsers**: Chrome, Edge, Firefox, Safari (any browser with Gamepad API support)
- **Tested with**: Xbox Cloud Gaming, gamepadviewer.com

The script only activates when it detects the specific controller ID string `8BitDo Ultimate 3mode Xbox`. It will not affect other controllers.

## How It Works

The script overrides `navigator.getGamepads()` at page load (`document-start`) and:

1. Detects the 8BitDo controller by its ID string
2. Remaps button indices to match the W3C standard layout
3. Converts trigger axes from [-1, 1] range to [0, 1] analog buttons
4. Decodes the hat switch axis into 4 digital D-pad buttons (with 8-direction diagonal support)
5. Merges back paddle inputs with L3/R3 stick clicks
6. Sets the `mapping` property to `"standard"`

Other controllers pass through unmodified.

## Adapting for Other Controllers

If you have a different 8BitDo controller with similar issues:

1. Open a [gamepad tester](https://gamepadviewer.com/) in your browser
2. Note the controller's ID string from the Gamepad API
3. Press each button and record which raw index it maps to
4. Update `CONTROLLER_ID_MATCH` and the button mapping in `remapGamepad()`
5. Submit a PR to add support for your controller!

## Technical Details

- **Protocol**: The controller uses Microsoft's GIP (Gaming Input Protocol) over USB/2.4GHz but falls back to standard HID over Bluetooth
- **HID Report**: UsagePage 1 (Generic Desktop), Usage 5 (Game Pad), with Simulation page (0x02) for triggers
- **Hat Switch**: Axis 9 encodes 8 directions as values spaced 2/7 (~0.2857) apart in [-1, 1.286] range
- **Trigger Rest Value**: Raw axes 3 and 4 rest at -1.0 (causing phantom inputs if not remapped)

## Contributing

Contributions are welcome! If you have a different 8BitDo controller model, please:

1. Open an issue with your controller model and the raw Gamepad API data
2. Or submit a PR adding support for your controller

## License

MIT
