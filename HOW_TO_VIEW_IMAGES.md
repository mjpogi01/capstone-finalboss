# How to View and Convert Use Case Diagram Images

## Image Files Created

### 1. **Use_Case_Diagram.svg** (Vector Image)
   - **What it is**: Scalable vector graphic - can be opened as a picture
   - **How to view**:
     - Double-click the file (opens in default browser or image viewer)
     - Right-click → Open With → Any image viewer or browser
     - Drag and drop into any browser
   - **Advantages**: 
     - Can be zoomed infinitely without quality loss
     - Can be converted to PNG/JPG
     - Can be embedded in documents

### 2. **Use_Case_Diagram_Enhanced.puml** (PlantUML Source)
   - **What it is**: Source file that can generate images
   - **How to convert to image**:
     - See methods below

---

## Method 1: View SVG Directly (Easiest)

1. **Windows**: Double-click `Use_Case_Diagram.svg`
2. **Browser**: Drag file into Chrome/Firefox/Edge
3. **Image Viewer**: Most modern image viewers support SVG

---

## Method 2: Convert SVG to PNG/JPG

### Online Converters (Easiest):
1. Go to: https://cloudconvert.com/svg-to-png
2. Upload `Use_Case_Diagram.svg`
3. Download as PNG or JPG

### Using Inkscape (Free Software):
1. Download Inkscape: https://inkscape.org/
2. Open `Use_Case_Diagram.svg`
3. File → Export PNG Image
4. Choose resolution (e.g., 300 DPI for print)

### Using Command Line (if you have ImageMagick):
```bash
magick Use_Case_Diagram.svg Use_Case_Diagram.png
```

---

## Method 3: Generate Image from PlantUML

### Option A: Online PlantUML Server
1. Go to: http://www.plantuml.com/plantuml/uml/
2. Copy contents of `Use_Case_Diagram_Enhanced.puml`
3. Paste into the editor
4. Click "Submit" or "Export" to download as PNG/SVG

### Option B: VS Code Extension
1. Install "PlantUML" extension in VS Code
2. Open `Use_Case_Diagram_Enhanced.puml`
3. Press `Alt+D` or right-click → "Preview Current Diagram"
4. Right-click preview → "Export Current Diagram" → Choose PNG/SVG

### Option C: PlantUML Command Line
1. Install Java: https://www.java.com/
2. Download PlantUML JAR: http://plantuml.com/download
3. Run command:
```bash
java -jar plantuml.jar Use_Case_Diagram_Enhanced.puml -tpng
```

### Option D: Online Tools
- **PlantText**: https://www.planttext.com/
- **PlantUML Web Server**: http://www.plantuml.com/plantuml/uml/

---

## Method 4: Screenshot from HTML Files

1. Open `Use_Case_Diagram_Visual.html` in browser
2. Press `F11` for fullscreen (optional)
3. Take screenshot:
   - **Windows**: `Win + Shift + S`
   - **Mac**: `Cmd + Shift + 4`
   - **Browser**: Right-click → Inspect → Screenshot tool

---

## Recommended Approach

**For Quick Viewing**: 
- Just open `Use_Case_Diagram.svg` in your browser

**For Documents/Presentations**:
- Convert SVG to PNG using online converter (Method 2)
- Or use PlantUML online server (Method 3, Option A)

**For High Quality Print**:
- Use Inkscape to export SVG at 300 DPI (Method 2)

---

## File Locations

All files are in your project root:
- `Use_Case_Diagram.svg` - Vector image (ready to view)
- `Use_Case_Diagram_Enhanced.puml` - PlantUML source
- `Use_Case_Diagram_Visual.html` - Interactive HTML
- `Use_Case_Wireframe.html` - Flow wireframe

---

## Quick Start

**Just want to see it now?**
1. Open `Use_Case_Diagram.svg` in your browser
2. Done! ✅

**Need a PNG/JPG file?**
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `Use_Case_Diagram.svg`
3. Download PNG/JPG
4. Done! ✅


