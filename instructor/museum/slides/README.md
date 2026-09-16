# Build the instructor deck

The generated deck is `docs/instructor/museum-instructor.pptx`. All diagrams use editable PowerPoint shapes and text. No external images or fonts are downloaded by the build.

From this directory:

```bash
npm ci --ignore-scripts --no-audit --fund=false
npm run build
```

The deck uses Georgia and Trebuchet MS. Install those fonts on the presentation machine or inspect PowerPoint's substitutions before teaching.

The eight slides have sparse projected text and detailed speaker notes. Update `build.cjs` when the teaching cues, lesson boundaries, or sample architecture change. The instructor guide maps each slide to its place in the workshop.

Before distributing a changed deck, open or render every slide. Check text fit, arrows, contrast, and notes. A successful `.pptx` build does not prove that a slide is readable.

The build normalizes the notes-master element order emitted by PptxGenJS 4.0.1 so the package follows the Office XML schema.
