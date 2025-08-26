Text to PDF (macOS desktop app)
================================

A minimal Electron desktop editor for macOS that lets you create or open a document, format text, and save it as a white-background PDF. It supports opening `.txt`, `.md`, and extracting text from `.pdf` files for editing.

Features
--------
- New/Open/Save workflow
  - Open `.txt`, `.md`, `.html`, or `.pdf` files
  - PDF files extract text content with basic paragraph formatting
  - HTML files preserve all formatting
  - Text files are converted to HTML with proper paragraph breaks
  - Save exports the current document to PDF with a white page background
- Formatting toolbar
  - Bold, Italic, Underline
  - Align Left/Center/Right
  - Bulleted and Numbered lists
  - Font size chooser (10–24 px)
  - Font color picker with clear option
- Smart paste behavior
  - Pasted text preserves original formatting (colors, font sizes, styling)
  - No automatic formatting conversion on paste
- Smart font sizing behavior
  - Dropdown reflects the current selection/caret size
  - Changing size with no selection applies to new typing
  - Moving the caret into differently formatted text adopts that size
- Unsaved-changes safety prompt on window close
  - Save, Quit without Saving, or Cancel
- Simple macOS launcher script `start.command`

Requirements
------------
- macOS
- Node.js 18+ (recommended LTS)

Getting Started
---------------

Install dependencies
```
npm install
```

Run the app (development)
```
npm start
```

Or double-click the provided launcher:
- `start.command` (installs deps if missing, then launches)

Build a macOS distributable (optional)
```
npm run dist
```
The output DMG/ZIP will be created by `electron-builder` in the `dist/` directory.

Usage Notes
-----------
- The editor uses a dark theme for writing, but PDFs are saved on plain white pages.
- PDF import extracts the textual content for editing (layout/images are not preserved).


Keyboard Shortcuts
------------------
- New: Cmd+N
- Open: Cmd+O
- Save (Export to PDF): Cmd+S
- Bold: Cmd+B
- Italic: Cmd+I
- Underline: Cmd+U
- Align Left: Cmd+L
- Center: Cmd+E
- Align Right: Cmd+J

Project Scripts
---------------
- `npm start`: start Electron in dev
- `npm run dist`: build app installers with `electron-builder`

Tech Stack
----------
- Electron (Main/Renderer)
- `pdf-parse` for importing text from PDF

Troubleshooting
---------------
- If macOS blocks the launcher script, right-click `start.command` → Open.
- If fonts look too large after changing size, ensure you have text selected or place the caret on the exact line before changing size. The app keeps new typing at the chosen size.

License
-------
MIT


