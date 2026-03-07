# 07/03 Fixes

Date: 2026-03-07

## Appearance navigation move

- Moved the appearance and theme-management UI out of the `My Profile` tab set into its own dedicated `/appearance` page.
- Added `Appearance` as a sidebar item directly under `My Profile`.
- Added the same `Appearance` entry to the mobile "More" menu so navigation stays consistent on smaller screens.
- Kept the existing theme functionality unchanged by reusing the same `ThemePreferenceControl` and `ThemeEditor` components on the new page.
- Removed the old `Appearance` tab from the `My Profile` screen so that page now only contains `Profile` and `Activity`.
- Updated frontend tests to cover the new appearance route and navigation entry.
