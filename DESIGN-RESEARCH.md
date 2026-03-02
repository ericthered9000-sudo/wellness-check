# Design Research - Wellness Check App

**Research Date:** 2026-02-28  
**Goal:** Create the best-looking, easiest-to-use wellness app for elderly users

---

## Top Wellness/Health Apps Analysis

### 1. Apple Health
**Strengths:**
- Clean, minimal interface with lots of white space
- Large, clear typography
- Color-coded categories (red for heart, blue for activity, etc.)
- Simple card-based layout
- Easy-to-read charts with minimal clutter

**Key Takeaways:**
- Use plenty of white space
- Large touch targets (minimum 44px for buttons)
- Clear visual hierarchy
- Consistent color coding for categories

### 2. Fitbit
**Strengths:**
- Prominent daily score/ring visual
- Celebratory animations for achievements
- Clear progress indicators
- Simple navigation tabs at bottom
- Large numbers for key metrics

**Key Takeaways:**
- Visual progress indicators motivate users
- Celebrations create positive feedback loops
- Bottom navigation is easier for thumbs
- Single metric focus per screen

### 3. Calm/Headspace
**Strengths:**
- Soothing color palettes (blues, greens, purples)
- Minimal text on main screens
- Large, obvious action buttons
- Progressive disclosure (simple first, details later)
- Clear audio/visual feedback

**Key Takeaways:**
- Calming colors reduce anxiety
- Less text, more visuals
- One primary action per screen
- Clear feedback for every interaction

### 4. MyFitnessPal
**Strengths:**
- Clear daily progress bar
- Large, easy-to-tap food buttons
- Persistent bottom navigation
- Green/yellow/red color coding for goals

**Key Takeaways:**
- Progress bars show status at a glance
- Color coding for goal achievement
- Persistent navigation reduces confusion

---

## Senior-Friendly UI Best Practices

### Typography
| Element | Recommendation |
|---------|----------------|
| Body text | 18-20px minimum |
| Headings | 24-32px |
| Key metrics | 48-72px |
| Line height | 1.5-1.6 |
| Font weight | Medium (500) for readability |

### Color Contrast
- **Normal text:** 4.5:1 minimum contrast ratio
- **Large text:** 3:1 minimum
- **Interactive elements:** 3:1 against background
- **Current app:** Good high-contrast mode available

### Touch Targets
- Minimum: 44x44px (Apple standard)
- Recommended: 48x48px (Android standard)
- Spacing between targets: 8px minimum
- Current app buttons appear adequate

### Navigation
- **Maximum 5 items** in bottom navigation
- **Labels on all icons** (no icon-only buttons)
- **Clear "back" option** always visible
- **Home screen** should be reachable in 1 tap

---

## Color Palette Recommendations

### Current Wellness Check Themes
The app already has 6 themes - good variety!

### Recommended Enhancements
1. **Increase contrast** in Calm theme (text can be hard to read)
2. **Add semantic colors:**
   - Success/wellness: Green (#10b981)
   - Warning/attention: Amber (#f59e0b)
   - Alert/urgent: Red (#ef4444)
   - Info/neutral: Blue (#3b82f6)

3. **Button colors by action:**
   - Primary actions: Brand color
   - Destructive actions: Red
   - Success actions: Green
   - Cancel actions: Gray

---

## Specific Recommendations for Wellness Check

### Layout Improvements

#### Home Screen (Senior View)
```
┌─────────────────────────────┐
│  🔔 Notifications Banner    │  ← New: Shows appointment reminders
├─────────────────────────────┤
│                             │
│     ╭───────────────╮       │
│     │   WELLNESS    │       │
│     │     SCORE     │       │  ← Central, large, prominent
│     │      85       │       │
│     │   out of 100  │       │
│     ╰───────────────╯       │
│                             │
├─────────────────────────────┤
│  [✓ I'm Okay!]  (Large)     │  ← Single primary action
├─────────────────────────────┤
│  📅 Upcoming: Dr. Johnson   │  ← Quick appointment view
│  💊 Today's Meds: 2/3       │  ← Quick med status
├─────────────────────────────┤
│  [Record Activity]          │  ← Secondary, collapsible
│  [View Weekly Report]       │
└─────────────────────────────┘
```

#### Bottom Navigation (Recommended)
```
┌─────────────────────────────┐
│  🏠 Home  │  💊 Meds  │  📅 Appts  │  📊 Report  │  ⚙️ More  │
└─────────────────────────────┘
```
- Always visible
- Maximum 5 items
- Labels + icons
- Current section highlighted

### Card Design Improvements

#### Current
- Cards have consistent styling
- Good shadows and borders

#### Recommended Enhancements
1. **Increase padding** inside cards (16px → 20px)
2. **Larger tap targets** for card actions
3. **Visual status indicators:**
   - ✅ Green checkmark for "done/taken"
   - ⏰ Amber clock for "due soon"
   - ❗ Red alert for "overdue/urgent"

### Button Hierarchy

#### Primary Buttons (Main Actions)
```
[  ✅ I'm Okay!  ]     ← Full width, prominent color
```
- Background: Primary color
- Text: White
- Height: 56px minimum
- Font: 18px, semibold

#### Secondary Buttons
```
[  📊 View Report  ]   ← Outlined style
```
- Background: Transparent
- Border: 2px, primary color
- Text: Primary color
- Height: 48px

#### Tertiary Buttons (Less Important)
```
[  Skip  ]  [  Delete  ]
```
- Background: Light gray
- Text: Dark gray
- Height: 44px

---

## Accessibility Checklist

✅ **Implemented:**
- High contrast mode toggle
- Text size options (S, M, L, XL)
- Multiple theme options

🔲 **Recommended:**
- Screen reader labels (aria-labels)
- Focus indicators for keyboard navigation
- Voice input for check-in button
- Reduce motion option for animations
- Color-blind friendly palette option

---

## Animation & Feedback

### Micro-interactions
1. **Button press:** Scale down 95%, shadow reduces
2. **Success:** Green checkmark pulse
3. **Loading:** Subtle pulse animation
4. **New notification:** Gentle slide-in from top

### Feedback Messages
- Use toast notifications instead of alerts
- Auto-dismiss after 3 seconds
- Clear success/error states
- No technical jargon

---

## Mobile-First Considerations

### Current App
- Responsive design
- Touch-friendly buttons
- Good use of spacing

### Enhancements
1. **Safe area insets** for notched phones
2. **Pull-to-refresh** for data updates
3. **Swipe gestures** for marking meds as taken
4. **Haptic feedback** for button presses (where supported)

---

## Implementation Priority

### Phase 1: Quick Wins
1. ✅ Add bottom navigation
2. ✅ Increase button sizes
3. ✅ Add notification banner
4. ✅ Improve color contrast

### Phase 2: Polish
1. Add micro-animations
2. Implement toast notifications
3. Add voice input option
4. Improve card layouts

### Phase 3: Advanced
1. Reduce motion option
2. Screen reader optimization
3. Haptic feedback
4. Offline mode improvements

---

## Competitor Screenshot References

*(Would add screenshots here in production)*

For reference, see:
- Apple Health: Minimal cards, large typography
- Fitbit: Score rings, celebratory animations
- Calm: Soothing colors, minimal text
- MyFitnessPal: Progress bars, green/yellow/red coding

---

## Conclusion

The Wellness Check app has a strong foundation with:
- Solid theme system
- Clean, simple layout
- Good accessibility options

Key improvements for "best on market":
1. **Add bottom navigation** for easier thumb access
2. **Larger touch targets** throughout
3. **More prominent primary actions**
4. **Visual status indicators** (✅ ⏰ ❗)
5. **Celebratory animations** for achievements

The goal: Make every interaction feel effortless and rewarding for elderly users.

---

*Research compiled by Bob, 2026-02-28*