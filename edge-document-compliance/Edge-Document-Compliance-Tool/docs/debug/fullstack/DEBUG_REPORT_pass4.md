# Debug Report - Pass 4: UI Wiring & Layout

**Date**: 2025-01-13  
**Focus**: Frontend JavaScript errors, button wiring, layout defects

## Evidence Collection

### Known Issues (from previous reports)

1. **Header Layout** ✅ FIXED (Pass 1)
   - Overlapping text issue resolved
   - Logo clarity improved
   - Dark mode implemented

2. **Time-based Greeting** ✅ FIXED (Pass 1)
   - Greeting now changes based on time of day

3. **JavaScript Errors** (from user reports):
   - `TypeError: Cannot set properties of null (setting 'textContent')` - renderFileList
   - `TypeError: Cannot set properties of null (setting 'innerHTML')` - renderRegulatoryWebsites
   - These were fixed in previous passes

### Current UI Structure

**Main Sections**:
- Header (CONFORM EDGE branding + EDCAT Administrator)
- Greeting Banner
- Left Area (Documents to Review - client documents)
- Right Sidebar (Compliance Documents Library + Extracted Requirements)

**Compliance Documents Library**:
- STANDARDS section (with upload, edit, parse buttons)
- REGULATIONS section (with upload, refresh buttons)
- CUSTOMER REQUIREMENTS section (with upload button)

**Key Functions** (from index.html):
- `loadFilesFromDatabase()` - Loads files on page load
- `renderStandardsInLibrary()` - Renders standards list
- `renderRegulationsInLibrary()` - Renders regulations list
- `renderCustomerRequirementsInLibrary()` - Renders customer requirements
- `parseStandard()` - Triggers parsing
- `deleteStandard()` - Deletes standard
- `showEditStandardModal()` - Opens edit modal
- `refreshRegulations()` - Refreshes regulations

### Potential Issues

1. **Null Element References**
   - Functions may reference elements that don't exist
   - Need to verify all `getElementById` calls have null checks

2. **Event Handler Wiring**
   - Verify all buttons have onclick handlers
   - Check for missing event listeners

3. **Layout Issues**
   - Verify responsive design
   - Check for overflow/clipping
   - Ensure dark mode works correctly

## Next Steps

See `TODO_pass4.md` for verification and fixes.

