// ==UserScript==
// @name         8BitDo Ultimate 3mode Xbox - Standard Gamepad Remapper
// @namespace    https://github.com/leandrosalgado/8bitdo-ultimate-macos-remapper
// @version      1.4
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
  // Up = -1.0, Down = 0.143, Left = 0.714, Right = -0.429
  // Idle = 1.0 (approximately, when no d-pad pressed)
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
      up || upRight || upLeft, // d-pad up
      down || downRight || downLeft, // d-pad down
      left || downLeft || upLeft, // d-pad left
      right || upRight || downRight // d-pad right
    ];
  }

  function makeFakeButton(pressed, value) {
    return { pressed: pressed, touched: pressed, value: value };
  }

  function remapGamepad(original) {
    if (!original || !original.id.includes(CONTROLLER_ID_MATCH)) {
      return original;
    }

    // Source mapping (what the controller actually reports):
    // Btn 0=A, 1=B, 2=Right paddle, 3=X, 4=Y, 5=Left paddle
    // Btn 6=LB, 7=RB, 8=LT(digital), 9=RT(digital)
    // Btn 10=View, 11=Menu, 12=?(macOS), 13=L3, 14=R3, 15=Share
    // Axis 0=LX, 1=LY, 2=RX, 3=RT(-1..1), 4=LT(-1..1), 5=RY, 9=Hat
    //
    // Standard gamepad mapping (what Xbox Cloud expects):
    // Btn 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT
    // Btn 8=View, 9=Menu, 10=L3, 11=R3
    // Btn 12=Up, 13=Down, 14=Left, 15=Right, 16=Xbox
    // Axis 0=LX, 1=LY, 2=RX, 3=RY

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
      makeFakeButton(ob[0].pressed, ob[0].value), // 0: A
      makeFakeButton(ob[1].pressed, ob[1].value), // 1: B
      makeFakeButton(ob[3].pressed, ob[3].value), // 2: X (was raw 3)
      makeFakeButton(ob[4].pressed, ob[4].value), // 3: Y (was raw 4)
      makeFakeButton(ob[6].pressed, ob[6].value), // 4: LB (was raw 6)
      makeFakeButton(ob[7].pressed, ob[7].value), // 5: RB (was raw 7)
      makeFakeButton(ltAnalog > 0.1, ltAnalog), // 6: LT (from axis 4)
      makeFakeButton(rtAnalog > 0.1, rtAnalog), // 7: RT (from axis 3)
      makeFakeButton(ob[10].pressed, ob[10].value), // 8: View (was raw 10)
      makeFakeButton(ob[11].pressed, ob[11].value), // 9: Menu (was raw 11)
      makeFakeButton(l3Pressed, l3Pressed ? 1 : 0), // 10: L3 (stick click OR left paddle)
      makeFakeButton(r3Pressed, r3Pressed ? 1 : 0), // 11: R3 (stick click OR right paddle)
      makeFakeButton(dpadUp, dpadUp ? 1 : 0), // 12: D-pad Up
      makeFakeButton(dpadDown, dpadDown ? 1 : 0), // 13: D-pad Down
      makeFakeButton(dpadLeft, dpadLeft ? 1 : 0), // 14: D-pad Left
      makeFakeButton(dpadRight, dpadRight ? 1 : 0), // 15: D-pad Right
      makeFakeButton(ob[15].pressed, ob[15].value), // 16: Xbox/Guide (from raw 15)
    ];

    const remappedAxes = [
      oa[0], // Left Stick X
      oa[1], // Left Stick Y
      oa[2], // Right Stick X
      oa[5], // Right Stick Y (was axis 5)
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

  console.log('[8BitDo Remapper] Gamepad API intercepted. Waiting for 8BitDo Ultimate 3mode Xbox controller...');
})();
