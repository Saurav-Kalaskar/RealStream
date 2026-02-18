---
page: profile_screen
---
A glassmorphic User Profile screen.
The user wants to see their stats (followers, views), their uploaded videos, and settings.

**DESIGN SYSTEM (REQUIRED):**
[Copy from DESIGN.md]
# Design System: RealStream
**Project ID**: 8207951135423758930

## 1. Visual Theme & Atmosphere
**"Deep Space Immersion"**
The interface feels like a futuristic, holographic display floating in deep space. It is dark, immersive, and sleek, using light beams and glows to create depth. The aesthetic is "Glassmorphic Cyberpunk" without being gritty—it's clean, high-tech, and professional.

## 2. Color Palette & Roles
*   **Deep Space Blue** (`#101722`): Primary background. Acts as the void/canvas.
*   **Neon Cyan** (`#257bf4`): Primary accent. Used for branding, active states, and primary buttons.
*   **Starlight White** (`#FFFFFF`): Primary text and icons.
*   **Nebula Glow** (`rgba(37, 123, 244, 0.15)`): Ambient background glows.
*   **Glass Surface** (`rgba(34, 50, 73, 0.4)`): Panel backgrounds with blur.

## 3. Typography Rules
*   **Font**: Inter (Google Fonts).
*   **Headings**: Bold/ExtraBold, tight tracking (`tracking-tighter`).
*   **Body**: Regular/Medium, clean and legible.

## 4. Component Stylings
*   **Buttons**:
    *   **Primary**: Neon Cyan background, White text, rounded-xl, shadow-lg.
    *   **Ghost**: Transparent/Glass background, hover effects.
*   **Cards/Panels**:
    *   **Glass Panel**: `backdrop-filter: blur(12px)`, thin white/transparent border, subtle drop shadow.
    *   **Roundness**: `rounded-2xl` or `rounded-xl` (Matches "ROUND_EIGHT" theme from Stitch).
*   **Search Input**:
    *   Floating 3D container, glass background, large text.

## 5. Layout Principles
*   **Desktop**:
    *   **Three-Column Layout**: 
        *   Left: Trending Sidebar (Glass Panel, fixed).
        *   Center: Mobile-style Feed (Fixed 400px width).
        *   Right: Suggested Creators (Glass Panel, fixed).
    *   **Background**: Visible vertical beams and geometric 3D shapes.
*   **Mobile**: Full-screen immersive feed, easy thumb-reach controls, hidden decorative elements to save space.
*   **Spacing**: Generous padding (`p-6`, `p-8`) to allow the design to breathe.
