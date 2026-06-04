# Gestures

All gestures in `CameraScreen.tsx` use React Native's `PanResponder` API.

---

## 1. Open Settings — swipe right on camera view

**Responder:** `panResponder` (attached to the root `<View>`)

| Property | Value |
|----------|-------|
| Direction | Left → Right (positive `dx`) |
| Activation threshold | `dx > 30` AND `vx > 0.2` AND horizontal (|dy| < |dx|) |
| Trigger threshold | `dx > 50` on release |
| Effect | Stops scanning if active → slides settings in from left (300 ms) |

```ts
onMoveShouldSetPanResponder: (evt, { dx, dy, vx }) =>
  dx > 30 && Math.abs(dy) < Math.abs(dx) && vx > 0.2,
onPanResponderRelease: (evt, { dx }) => {
  if (dx > 50) { stopScanning(); openSettings(); }
}
```

---

## 2. Close Settings — swipe left on settings panel

**Responder:** `closePanResponder` (attached to the settings `<Animated.View>`)

| Property | Value |
|----------|-------|
| Direction | Right → Left (negative `dx`) |
| Activation threshold | `dx < -20` AND horizontal (|dy| < |dx|) |
| Interactive tracking | `slideAnim` set directly to `gestureState.dx` (clamped to `[-screenWidth, 0]`) |
| Close threshold | `dx < -screenWidth/3` OR `vx < -0.3` on release |
| On close | Animate to `-screenWidth` (250 ms) → unmount `SettingsScreen` |
| On snap-back | Spring to `0` (bounciness: 4) |

---

## 3. Settings close button — `×` icon in SettingsScreen header

`SettingsScreen` has its own close button that calls `onClose()` prop, which triggers the full `closeSettings()` animation in `CameraScreen`.

---

## 4. Gear button — settings button (top-left of camera view)

A `HapticButton` at `top: 56, left: 20`. Stops scanning and opens settings on press.

---

## Slide animation state

```ts
const slideAnim = useRef(new Animated.Value(-screenWidth)).current;
```

- `-screenWidth` → off-screen (settings hidden)
- `0` → fully visible
- Intermediate values during interactive drag

Settings is conditionally mounted (`settingsVisible` state) to avoid rendering while hidden:
```ts
{settingsVisible && <SettingsScreen onClose={closeSettings} />}
```
`settingsVisible` is set to `true` before the open animation starts, and to `false` only in the `onPanResponderRelease`/`start()` callback after the close animation completes.

---

## Custom Slider (SettingsScreen)

The cooldown slider uses `PanResponder` on its container view.
Critical detail: the track and thumb child elements must have `pointerEvents="none"` so that `evt.nativeEvent.locationX` is always relative to the container, not a child subview boundary.

```tsx
<View
  style={styles.sliderContainer}
  onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
  {...panResponder.panHandlers}
>
  <View ... pointerEvents="none">...</View>  {/* track */}
  <View ... pointerEvents="none" />          {/* thumb */}
</View>
```
