# Compact Layout UI - Modular Structure

This directory contains the new compact layout UI with modular CSS and JavaScript files.

## Structure

```
app/
├── index.html          # New compact layout (uses external CSS/JS)
├── css/
│   └── layout.css     # All styles extracted from inline <style>
├── js/
│   ├── state.js       # Application state management
│   ├── sidebar.js     # Sidebar navigation handlers
│   ├── theme.js       # Dark mode toggle
│   └── chat.js        # Chat interface (wraps existing API)
└── README.md          # This file
```

## Usage

1. **Original UI** (unchanged): `/public/index.html`
2. **New Compact UI**: `/app/index.html`

Both can run simultaneously without conflicts.

## Integration

The new layout:
- Uses existing `/api/chat/analyze` endpoint (no backend changes)
- Preserves all existing functionality
- Does NOT modify existing `vera.js` or backend code
- Can be tested independently before switching

## Testing

1. Open `/public/index.html` - verify original works
2. Open `/app/index.html` - verify new layout works
3. Both should function independently

## Deployment

When ready to switch:
1. Backup `/public/index.html` → `/public/index.html.backup`
2. Copy `/app/index.html` → `/public/index.html`
3. Copy `/app/css/` and `/app/js/` to `/public/`
4. Update script paths if needed

