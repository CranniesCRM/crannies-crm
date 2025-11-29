# Crannies CRM - Design Guidelines

## Design Approach

**Selected Approach:** Design System (GitHub-inspired with CRM enhancements)

**Justification:** Crannies is a utility-focused collaboration platform requiring information density, stability, and custom UI patterns. Drawing from GitHub's proven interface design while adapting for CRM workflows ensures familiarity for technical teams while maintaining professional CRM aesthetics.

**Key Design Principles:**
- Clarity over decoration: Clean, purposeful interfaces that prioritize content
- Spatial hierarchy: Use whitespace strategically to separate content zones
- Progressive disclosure: Show essential information first, reveal details on interaction
- Consistent interaction patterns: Similar actions behave the same across contexts

---

## Typography

**Font Families:**
- Primary (UI/Body): Inter (Google Fonts) - weights: 400, 500, 600
- Monospace (Code/Data): JetBrains Mono - weight: 400

**Type Scale:**
- Page titles: text-3xl font-semibold
- Section headers: text-2xl font-semibold  
- Card/Component titles: text-lg font-medium
- Body text: text-base font-normal
- Secondary/Meta text: text-sm font-normal
- Small labels/badges: text-xs font-medium

---

## Layout System

**Spacing Primitives:** Use Tailwind units: 2, 3, 4, 6, 8, 12, 16, 24
- Micro spacing (within components): 2, 3, 4
- Component internal padding: 4, 6, 8
- Component gaps/margins: 6, 8, 12
- Section spacing: 12, 16, 24

**Grid Patterns:**
- Main app layout: Sidebar (w-64) + Content area (flex-1)
- Issue/Deal list: Single column with card rows
- Dashboard: 3-column grid on desktop (grid-cols-3), 1-column mobile
- User profiles grid: 4-column on xl, 3-column on lg, 2-column on md, 1-column mobile

**Container Strategy:**
- App chrome: Full width with max-w-screen-2xl
- Content areas: max-w-5xl for readability
- Modals/Dialogs: max-w-2xl for forms, max-w-4xl for complex workflows

---

## Component Library

### Navigation & Chrome

**Top Navigation Bar:**
- Fixed header (h-16) with logo left, workspace switcher center-left, user profile/notifications right
- Include workspace name with dropdown for switching
- Profile shows avatar (w-8 h-8 rounded-full), admin users get a star badge overlay
- Notification bell icon with red dot indicator for unread items

**Sidebar Navigation:**
- Collapsible panel (w-64 expanded, w-16 collapsed)
- Navigation sections: Dashboard, Issues (Deals), Contacts, Team, Settings
- Each nav item: icon + label, hover state with subtle background
- Active state: border-l-4 indicator with filled background
- Bottom pinned: Workspace settings + user profile compact view

### Core Data Components

**Issue/Deal Card (List View):**
- Horizontal layout with status badge, title, metadata row, assignee avatars
- Height: min-h-20, padding: p-4
- Left section: Status badge (Open/Closed/Won/Lost) + Issue number (#001)
- Middle: Title (text-base font-medium) + metadata row (labels as small pills, creation date)
- Right: Avatar stack (max 3 visible, "+N more" for overflow) + comment count icon

**Issue Detail Header:**
- Large title (text-3xl) with issue number and status badge
- Metadata bar below: Creator avatar + name, creation date, last updated, assignee chips
- Action buttons row: Edit, Change Status, Publish to Client (with pulsating green dot when active), More menu

**Comment Thread:**
- Each comment in card (border rounded-lg p-4 mb-4)
- Author section: Avatar (w-10 h-10) + name + role badge + timestamp
- Comment body: Markdown-rendered content with generous line-height (leading-relaxed)
- Attachment thumbnails below content in grid
- Inline reply and reaction buttons (subtle, appear on hover)

**Rich Text Editor:**
- Toolbar: formatting buttons (Bold, Italic, Code, List, Link, @Mention, Attachment)
- Text area: border rounded-lg min-h-32 with focus ring
- @mention dropdown: Appears below cursor showing filtered user list with avatars
- File upload area: Drag-and-drop zone or click to upload, show thumbnails with remove option

### Forms & Inputs

**Onboarding Flow:**
- Multi-step wizard with progress indicator (steps 1-8 shown as dots at top)
- Each step: Centered card (max-w-lg) with generous padding (p-8)
- Step title (text-2xl mb-6), then form fields stacked vertically (space-y-6)
- Profile picture upload: Circular dropzone (w-32 h-32) with preview
- Logo upload: Square dropzone (w-48 h-48) with preview
- Navigation: Back button (secondary style) + Continue button (primary style)

**Input Fields:**
- Standard height: h-12, padding: px-4
- Border radius: rounded-lg
- Label: text-sm font-medium mb-2
- Helper text below: text-xs text-muted
- Error state: red border with error message below

**Dropdown/Select:**
- Matches input height, with chevron icon right
- Dropdown panel: Absolute positioned, border shadow-lg rounded-lg
- Options: Hover state with background, selected state with checkmark

### Specialized Components

**User Profile Cards:**
- Card layout: p-6 rounded-lg border
- Header: Avatar (w-20 h-20 centered) with admin star badge if applicable
- Name (text-lg font-semibold) + Role (text-sm) + Team badge
- Quick actions: Email button, View profile link

**Published Chat Room:**
- Two-column layout on desktop (chat left 2/3, participants sidebar right 1/3)
- Chat messages: Speech bubble style alternating left (team) and right (client)
- Team messages: Avatar left with name above bubble
- Client messages: Different treatment, avatar right
- Input bar: Fixed bottom with attachment button, emoji button, send button
- Pulsating indicator: Animated green dot (w-3 h-3 rounded-full) with ping animation

**Dashboard Widgets:**
- Stat cards: Grid of metrics (Open Deals, Conversion Rate, Team Activity)
- Each card: p-6 rounded-lg border with large number (text-4xl font-bold) + label below
- Activity feed: Scrollable list showing recent actions with timestamps and user avatars
- Charts: Use Chart.js with minimal styling, focus on readability

### Interactive States

**Buttons:**
- Primary: px-6 py-2.5 rounded-lg font-medium
- Secondary: Same size, border variant
- Ghost: No border, hover shows background
- Icon buttons: w-10 h-10 rounded-lg centered icon

**Loading States:**
- Skeleton screens: Pulse animation on content blocks
- Spinners: Use for button loading states
- Progressive loading: Show content as it loads, not all-or-nothing

---

## Images

**Logo Integration:**
- Use provided Crannies logo in top navigation (h-8 auto-width)
- Workspace logo appears in workspace switcher dropdown
- Favicon: Use logo cropped to icon

**No Hero Images:** This is a SaaS application, not a marketing site. Focus on functional layouts.

**Profile/Avatar Images:**
- User avatars throughout: Consistent circular treatment
- Company logos: Square or rectangular in onboarding/settings
- All images: Lazy load, show placeholder until loaded

---

## Layout Patterns

**Authentication Pages:**
- Centered card layout (max-w-md) on subtle background
- Logo at top, form in card, footer links below
- Passwordless magic link: Email input + "Send Magic Link" button
- OAuth options: Grid of provider buttons below divider

**Main Application Layout:**
- Persistent sidebar + top bar structure
- Content area scrolls independently
- Modals overlay with backdrop blur
- Toast notifications: Top-right corner, stack vertically

**Responsive Behavior:**
- Desktop (lg+): Full sidebar + multi-column layouts
- Tablet (md): Collapsible sidebar + 2-column max
- Mobile: Bottom nav bar replaces sidebar, single column throughout

---

## Animation Strategy

**Minimal, Purposeful Motion:**
- Pulsating published indicator: Scale + opacity animation
- Dropdown menus: Slide down with fade (duration-200)
- Modal overlays: Fade in backdrop + scale modal (duration-300)
- Toast notifications: Slide in from right
- **No scroll animations, no complex page transitions**