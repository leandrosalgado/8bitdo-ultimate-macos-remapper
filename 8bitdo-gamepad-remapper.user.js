// ==UserScript==
// @name         8BitDo Ultimate 3mode Xbox - Standard Gamepad Remapper
// @namespace    https://github.com/leandrosalgado/8bitdo-ultimate-macos-remapper
// @version      1.3
// @description  Remaps 8BitDo Ultimate 3mode Xbox controller (Vendor: 2dc8, Product: 901b) to W3C standard gamepad mapping. Fixes phantom inputs, wrong button mapping, and broken triggers on macOS Bluetooth.
// @author       leandrosalgado
// @license      MIT
// @homepage     https://github.com/leandrosalgado/8bitdo-ultimate-macos-remapper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const VENDOR_PRODUCT = '2dc8-901b';
  const CONTROLLER_ID_MATCH = '8BitDo Ultimate 3mode Xbox';

  // Hat switch axis (axis 9) value -> d-pad direction mapping
  // Values observed from the controller:
  //   Up    = -1.0
  //   Down  =  0.143
  //   Left  =  0.714
  //   Right = -0.429
  //   Idle  =  1.0 (approximately, when no d-pad pressed; axis 9 = 0 at idle in some states)
  //
  // Hat switch reports 8 directions (0-7) mapped to -1..1 range:
  //   0=Up(-1), 1=UpRight(-0.714), 2=Right(-0.429), 3=DownRight(-0.143),
  //   4=Down(0.143), 5=DownLeft(0.429), 6=Left(0.714), 7=UpLeft(1.0 or wrapped)
  //   Null/idle = specific value when no direction pressed

  function hatToDpad(hatValue) {
    // Returns [up, down, left, right] as booleans
    // Hat switch values are spaced 2/7 (~0.2857) apart, so threshold must be < 0.143
    const threshold = 0.1;

    // Idle / no press — hat value is > 1.0
    if (hatValue > 0.95) return [false, false, false, false];

    // Map known hat values to directions with tolerance
    const isClose = (val, target) => Math.abs(val - target) < threshold;

    const up = isClose(hatValue, -1.0);
    const upRight = isClose(hatValue, -0.714);
    const right = isClose(hatValue, -0.429);
    const downRight = isClose(hatValue, -0.143);
    const down = isClose(hatValue, 0.143);
    const downLeft = isClose(hatValue, 0.429);
    const left = isClose(hatValue, 0.714);
    const upLeft = isClose(hatValue, 0.857);

    return [
      up || upRight || upLeft,       // d-pad up
      down || downRight || downLeft,  // d-pad down
      left || downLeft || upLeft,     // d-pad left
      right || upRight || downRight   // d-pad right
    ];
  }

  function makeFakeButton(pressed, value) {
    return {
      pressed: pressed,
      touched: pressed,
      value: value,
      __proto__: GamepadButton.prototype
    };
  }

  function remapGamepad(original) {
    if (!original || !original.id.includes(CONTROLLER_ID_MATCH)) {
      return original;
    }

    // Source mapping (what the controller actually reports):
    //   Button 0  = A
    //   Button 1  = B
    //   Button 2  = Right back paddle
    //   Button 3  = X
    //   Button 4  = Y
    //   Button 5  = Left back paddle
    //   Button 6  = LB
    //   Button 7  = RB
    //   Button 8  = LT (digital)
    //   Button 9  = RT (digital)
    //   Button 10 = View
    //   Button 11 = Menu
    //   Button 12 = ? (intercepted by macOS)
    //   Button 13 = L3
    //   Button 14 = R3
    //   Button 15 = Bottom-right center button (Share/Capture)
    //
    //   Axis 0 = Left Stick X
    //   Axis 1 = Left Stick Y
    //   Axis 2 = Right Stick X
    //   Axis 3 = RT analog (rest=-1, full=1) -- PHANTOM INPUT SOURCE
    //   Axis 4 = LT analog (rest=-1, full=1)
    //   Axis 5 = Right Stick Y
    //   Axis 9 = D-pad hat switch
    //
    // Standard gamepad mapping (what Xbox Cloud expects):
    //   Button 0  = A
    //   Button 1  = B
    //   Button 2  = X
    //   Button 3  = Y
    //   Button 4  = LB
    //   Button 5  = RB
    //   Button 6  = LT (analog 0-1)
    //   Button 7  = RT (analog 0-1)
    //   Button 8  = View/Back
    //   Button 9  = Menu/Start
    //   Button 10 = L3
    //   Button 11 = R3
    //   Button 12 = D-pad Up
    //   Button 13 = D-pad Down
    //   Button 14 = D-pad Left
    //   Button 15 = D-pad Right
    //   Button 16 = Xbox/Guide (mapped from raw button 15, bottom-right center)
    //
    //   Axis 0 = Left Stick X  (-1 to 1)
    //   Axis 1 = Left Stick Y  (-1 to 1)
    //   Axis 2 = Right Stick X (-1 to 1)
    //   Axis 3 = Right Stick Y (-1 to 1)

    const ob = original.buttons;
    const oa = original.axes;

    // Convert trigger axes from [-1, 1] range to [0, 1] range
    const ltAnalog = (oa[4] !== undefined) ? (oa[4] + 1) / 2 : 0;
    const rtAnalog = (oa[3] !== undefined) ? (oa[3] + 1) / 2 : 0;

    // D-pad from hat switch
    const [dpadUp, dpadDown, dpadLeft, dpadRight] = hatToDpad(oa[9]);

    // Back paddles: raw button 5 (left) -> L3, raw button 2 (right) -> R3
    const l3Pressed = ob[13].pressed || ob[5].pressed;
    const r3Pressed = ob[14].pressed || ob[2].pressed;

    const remappedButtons = [
      ob[0],                                          // 0: A -> A
      ob[1],                                          // 1: B -> B
      ob[3],                                          // 2: X (was button 3)
      ob[4],                                          // 3: Y (was button 4)
      ob[6],                                          // 4: LB (was button 6)
      ob[7],                                          // 5: RB (was button 7)
      makeFakeButton(ltAnalog > 0.1, ltAnalog),       // 6: LT (from axis 4)
      makeFakeButton(rtAnalog > 0.1, rtAnalog),       // 7: RT (from axis 3)
      ob[10],                                         // 8: View (was button 10)
      ob[11],                                         // 9: Menu (was button 11)
      makeFakeButton(l3Pressed, l3Pressed ? 1 : 0),   // 10: L3 (stick click OR left back paddle)
      makeFakeButton(r3Pressed, r3Pressed ? 1 : 0),   // 11: R3 (stick click OR right back paddle)
      makeFakeButton(dpadUp, dpadUp ? 1 : 0),         // 12: D-pad Up
      makeFakeButton(dpadDown, dpadDown ? 1 : 0),      // 13: D-pad Down
      makeFakeButton(dpadLeft, dpadLeft ? 1 : 0),      // 14: D-pad Left
      makeFakeButton(dpadRight, dpadRight ? 1 : 0),    // 15: D-pad Right
      ob[15],                                          // 16: Xbox/Guide (from bottom-right center button)
    ];

    const remappedAxes = [
      oa[0],   // Left Stick X
      oa[1],   // Left Stick Y
      oa[2],   // Right Stick X
      oa[5],   // Right Stick Y (was axis 5)
    ];

    // Build a fake gamepad object with standard mapping
    const fakeGamepad = {
      id: original.id,
      index: original.index,
      connected: original.connected,
      timestamp: original.timestamp,
      mapping: 'standard',
      axes: remappedAxes,
      buttons: remappedButtons,
      hapticActuators: original.hapticActuators,
      vibrationActuator: original.vibrationActuator
    };

    // Preserve the prototype chain
    Object.setPrototypeOf(fakeGamepad, Gamepad.prototype);

    return fakeGamepad;
  }

  // Override navigator.getGamepads()
  const originalGetGamepads = navigator.getGamepads.bind(navigator);
  Object.defineProperty(navigator, 'getGamepads', {
    value: function () {
      const gamepads = originalGetGamepads();
      const result = [];
      for (let i = 0; i < gamepads.length; i++) {
        result.push(remapGamepad(gamepads[i]));
      }
      return result;
    },
    writable: false,
    configurable: true
  });

  // Override gamepadconnected event to patch the gamepad object
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'gamepadconnected' || type === 'gamepaddisconnected') {
      const wrappedListener = function (event) {
        const remapped = remapGamepad(event.gamepad);
        const fakeEvent = new GamepadEvent(event.type, {
          gamepad: remapped
        });
        listener.call(this, fakeEvent);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  console.log('[8BitDo Remapper] Gamepad API intercepted. Waiting for 8BitDo Ultimate 3mode Xbox controller...');
})();
