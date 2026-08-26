---
name: DismissFlow
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#454655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757687'
  outline-variant: '#c5c5d8'
  surface-tint: '#3648e9'
  primary: '#001bcc'
  on-primary: '#ffffff'
  primary-container: '#2d3fe2'
  on-primary-container: '#c6caff'
  inverse-primary: '#bdc2ff'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#384055'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f576d'
  on-tertiary-container: '#c6cde7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000865'
  on-primary-fixed-variant: '#1127d2'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding-mobile: 1rem
  container-padding-desktop: 2.5rem
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style
The design system is centered on clarity, safety, and calm efficiency—critical traits for a school dismissal environment. The aesthetic leans into **Modern Corporate Minimalism**, drawing inspiration from high-end productivity tools. The interface prioritizes a reduced cognitive load through generous whitespace, high-quality geometric typography, and a "software-as-a-service" premium feel. 

The emotional response should be one of absolute reliability and quiet sophistication. Visual complexity is minimized to ensure that critical information—such as student names and transport status—remains the primary focus.

## Colors
The palette utilizes an off-white, soft neutral canvas to reduce screen glare during extended use. 
- **Primary:** A deep, calm indigo (#2D3FE2) used for primary actions and active states.
- **Surface:** The background uses a layered approach of white (#FFFFFF) on top of a soft gray-blue wash (#F8FAFC).
- **Typography:** Deep slate (#0F172A) for headings to maintain high contrast, with muted slate (#64748B) for secondary metadata.
- **Semantic:** Emerald, Amber, and Rose are used sparingly for status indicators (Checked-out, Delayed, Flagged).

## Typography
Plus Jakarta Sans provides a contemporary, friendly, yet professional tone. 
- **Hierarchy:** Use tight letter-spacing on larger headlines to create a premium, "tucked" look. 
- **Scale:** Maintain a clear distinction between student names (Headline-MD) and secondary details like grade levels or guardian names (Body-MD/Label-MD).
- **Legibility:** Ensure body text never drops below 14px to maintain accessibility for staff moving quickly in outdoor or bright hallway environments.

## Layout & Spacing
This design system utilizes a **Fixed-Fluid Hybrid Grid**. 
- **Desktop:** A centered 12-column grid with a max-width of 1280px. 
- **Mobile:** A single-column fluid layout with safe-area insets.
- **Rhythm:** Spacing follows a strict 4px baseline. Components should generally use 16px (stack-md) for internal padding and 24px (stack-lg) for vertical section separation. 
- **Whitespace:** Use generous padding in cards to emphasize the "Premium" feel and prevent the UI from feeling "cramped" during high-stress dismissal windows.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Subtle Diffusion**.
- **Surfaces:** Use a 1px hairline border (Hex: #E2E8F0) as the primary separator for cards and inputs instead of heavy shadows.
- **Shadows:** When elevation is required (e.g., for modals or floating action buttons), use a "Soft-Ambient" style: `0px 10px 15px -3px rgba(0, 0, 0, 0.05)`.
- **Glassmorphism:** Navigation bars and mobile bottom-sheet headers should use a background-blur (8px to 12px) with a 70% opacity white fill to maintain context of the content beneath.

## Shapes
The shape language is approachable and modern.
- **Base Radius:** 16px (1rem) for all primary cards and container elements.
- **Small Radius:** 8px (0.5rem) for buttons, input fields, and checkboxes.
- **Pills:** Use full-rounding (999px) for status badges (e.g., "In Carline") and segmented controls.

## Components
Consistent implementation of these components ensures a cohesive experience:

- **Buttons:** Primary buttons use the indigo fill with white text. Secondary buttons use a white fill with a 1px slate-200 border. Use a slight "spring" scale effect (0.98x) on tap/click.
- **Cards:** All student and guardian cards must use the 16px rounded corners and the 1px hairline border. Background should be pure white against the off-white canvas.
- **Segmented Pills:** For switching views (e.g., "Bus," "Car," "Aftercare"), use a pill-shaped container with a sliding background highlight that follows the user's selection.
- **Input Fields:** Use a subtle slate-50 background fill that transitions to a white fill with an indigo border on focus.
- **Bottom Sheets:** On mobile, all "Action" menus (like changing a student's dismissal method) must slide up from the bottom with a frosted glass header and a tactile "grabber" bar.
- **Status Indicators:** Use small, high-contrast dots or subtle light-fill badges with text for semantic states. 
- **Micro-interactions:** Use spring-based transitions (`stiffness: 300, damping: 30`) for list reordering and state transitions to evoke a "calm" rather than "robotic" feel.