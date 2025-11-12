# PDF Compression Tool - Architecture

## Overview
A command-line interface (CLI) tool for compressing PDF files with configurable compression levels. The tool provides three compression modes: extreme, medium, and less, allowing users to balance between file size reduction and quality preservation.

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Interface                           │
│  - User Input Handler                                        │
│  - File Selection                                            │
│  - Compression Level Selection                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Input Validation Layer                      │
│  - File existence check                                      │
│  - PDF format validation                                     │
│  - Path validation                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│               Compression Controller                         │
│  - Compression level configuration                           │
│  - Workflow orchestration                                    │
│  - Error handling                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 PDF Processor Engine                         │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Image Compression Module                        │        │
│  │  - Extract embedded images                       │        │
│  │  - Compress based on level                       │        │
│  │  - Re-embed compressed images                    │        │
│  └─────────────────────────────────────────────────┘        │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Content Stream Optimization                     │        │
│  │  - Remove redundant operators                    │        │
│  │  - Optimize object streams                       │        │
│  └─────────────────────────────────────────────────┘        │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Font Subsetting                                 │        │
│  │  - Extract used glyphs                           │        │
│  │  - Create subsetted fonts                        │        │
│  └─────────────────────────────────────────────────┘        │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Metadata Optimization                           │        │
│  │  - Strip unnecessary metadata                    │        │
│  │  - Remove embedded thumbnails                    │        │
│  └─────────────────────────────────────────────────┘        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Output Handler                            │
│  - Save compressed PDF                                       │
│  - Generate compression report                               │
│  - Display statistics                                        │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. CLI Interface (`src/cli/`)
**Responsibility**: Handle user interaction and command-line arguments

**Components**:
- `index.js` - Main CLI entry point
- `prompts.js` - Interactive prompts for file selection and compression level
- `arguments.js` - Command-line argument parser

**Technologies**:
- Node.js
- Commander.js (command-line argument parsing)
- Inquirer.js (interactive prompts)

### 2. Input Validation Layer (`src/validators/`)
**Responsibility**: Ensure input integrity and security

**Components**:
- `fileValidator.js` - File existence and accessibility checks
- `pdfValidator.js` - PDF format validation
- `pathValidator.js` - Path sanitization and validation

**Validation Rules**:
- File must exist and be readable
- File must be a valid PDF (magic number check: `%PDF`)
- File size checks to prevent memory issues
- Path traversal prevention

### 3. Compression Controller (`src/controllers/`)
**Responsibility**: Orchestrate compression workflow

**Components**:
- `compressionController.js` - Main compression coordinator
- `configManager.js` - Compression level configuration

**Compression Levels Configuration**:

| Level    | Image Quality | Image DPI | Remove Metadata | Font Subsetting | Object Compression |
|----------|--------------|-----------|-----------------|-----------------|-------------------|
| Extreme  | 40%          | 72        | Yes             | Yes             | Maximum          |
| Medium   | 70%          | 150       | Partial         | Yes             | Moderate         |
| Less     | 85%          | 300       | No              | No              | Minimal          |

### 4. PDF Processor Engine (`src/processors/`)
**Responsibility**: Perform actual PDF compression operations

**Components**:
- `pdfProcessor.js` - Main processing coordinator
- `imageCompressor.js` - Image extraction and compression
- `streamOptimizer.js` - Content stream optimization
- `fontSubsetter.js` - Font subsetting operations
- `metadataStripper.js` - Metadata removal

**Processing Pipeline**:
1. **Parse PDF** - Load and parse PDF structure
2. **Extract Resources** - Identify images, fonts, and objects
3. **Compress Images** - Apply JPEG/JPEG2000 compression
4. **Optimize Streams** - Compress object streams with Flate
5. **Subset Fonts** - Remove unused font glyphs
6. **Strip Metadata** - Remove XMP metadata, thumbnails
7. **Rebuild PDF** - Reconstruct optimized PDF
8. **Linearize** - Optimize for web viewing (optional)

### 5. Output Handler (`src/output/`)
**Responsibility**: Save results and provide feedback

**Components**:
- `fileWriter.js` - Write compressed PDF to disk
- `reportGenerator.js` - Generate compression statistics
- `logger.js` - Console output formatting

## PDF Compression Techniques

### Image Compression
- **Method**: Re-encode images using JPEG with quality parameter
- **Extreme**: Quality 40%, downsample to 72 DPI
- **Medium**: Quality 70%, downsample to 150 DPI
- **Less**: Quality 85%, downsample to 300 DPI
- **Implementation**: Use Sharp/Jimp for image processing

### Stream Compression
- **Method**: Apply Flate (zlib) compression to content streams
- **Benefit**: Reduces size of text and vector graphics
- **Implementation**: Use zlib or pako library

### Font Subsetting
- **Method**: Extract only used characters from fonts
- **Benefit**: Reduces font file size significantly
- **Implementation**: Parse font tables, create subset

### Metadata Removal
- **Method**: Strip XMP metadata, document info, thumbnails
- **Benefit**: Small size reduction, privacy improvement
- **Levels**:
  - Extreme: Remove all metadata
  - Medium: Keep basic metadata (title, author)
  - Less: Preserve all metadata

### Object Deduplication
- **Method**: Identify and merge duplicate objects
- **Benefit**: Reduces redundancy in PDF structure
- **Implementation**: Hash-based object comparison

## Technology Stack

### Core Dependencies
- **pdf-lib**: PDF parsing and manipulation
- **sharp**: Image processing and compression
- **zlib**: Stream compression
- **commander**: CLI argument parsing
- **inquirer**: Interactive CLI prompts
- **chalk**: Terminal output formatting
- **ora**: Progress spinners

### Development Dependencies
- **eslint**: Code linting
- **jest**: Unit testing
- **prettier**: Code formatting

## File Structure
```
pdf-compression/
├── src/
│   ├── cli/
│   │   ├── index.js           # CLI entry point
│   │   ├── prompts.js         # Interactive prompts
│   │   └── arguments.js       # Argument parser
│   ├── validators/
│   │   ├── fileValidator.js   # File validation
│   │   ├── pdfValidator.js    # PDF validation
│   │   └── pathValidator.js   # Path validation
│   ├── controllers/
│   │   ├── compressionController.js  # Main controller
│   │   └── configManager.js          # Config management
│   ├── processors/
│   │   ├── pdfProcessor.js       # Main processor
│   │   ├── imageCompressor.js    # Image handling
│   │   ├── streamOptimizer.js    # Stream optimization
│   │   ├── fontSubsetter.js      # Font subsetting
│   │   └── metadataStripper.js   # Metadata removal
│   ├── output/
│   │   ├── fileWriter.js         # File writing
│   │   ├── reportGenerator.js    # Statistics
│   │   └── logger.js             # Logging
│   └── utils/
│       ├── constants.js          # Constants
│       └── helpers.js            # Helper functions
├── tests/
│   └── [test files mirror src structure]
├── examples/
│   └── sample.pdf
├── ARCHITECTURE.md
├── README.md
├── package.json
└── .gitignore
```

## Workflow Sequence

### User Interaction Flow
```
1. User runs: `pdf-compress` or `pdf-compress --file input.pdf --level medium`
2. If arguments missing, prompt for:
   - Input file path (with autocomplete)
   - Compression level (extreme/medium/less)
   - Output path (optional, defaults to input_compressed.pdf)
3. Validate inputs
4. Display compression settings
5. Start compression with progress indicator
6. Save compressed file
7. Display compression statistics:
   - Original size
   - Compressed size
   - Compression ratio
   - Time taken
```

### Compression Processing Flow
```
1. Load PDF file
2. Parse PDF structure
3. Analyze file components:
   - Count images
   - Identify fonts
   - Measure stream sizes
4. Apply compression based on level:
   - Compress images
   - Optimize streams
   - Subset fonts (if enabled)
   - Remove metadata (if enabled)
5. Rebuild PDF with compressed components
6. Write to output file
7. Generate report
```

## Error Handling Strategy

### Error Categories
1. **Input Errors**
   - File not found
   - Invalid PDF format
   - Insufficient permissions

2. **Processing Errors**
   - Corrupted PDF structure
   - Unsupported PDF features
   - Memory limitations

3. **Output Errors**
   - Disk space insufficient
   - Write permission denied
   - Path not writable

### Error Handling Approach
- Validate early, fail fast
- Provide clear error messages
- Suggest remediation steps
- Log errors for debugging
- Graceful degradation where possible

## Performance Considerations

### Memory Management
- Stream processing for large PDFs
- Chunk-based image processing
- Lazy loading of PDF objects
- Garbage collection optimization

### Processing Optimization
- Parallel image compression
- Async I/O operations
- Progress streaming
- Early termination on errors

## Security Considerations

### Input Sanitization
- Path traversal prevention
- File type verification
- Size limit enforcement
- Malicious PDF detection

### Privacy
- Metadata removal options
- No data transmission
- Local processing only
- Secure temp file handling

## Future Enhancements

### Phase 2 Features
- Batch processing
- Watch mode for folders
- Web interface
- API server mode

### Phase 3 Features
- OCR integration
- PDF/A conversion
- Encryption/decryption
- Cloud storage integration

## Testing Strategy

### Unit Tests
- Each module independently tested
- Mock external dependencies
- Edge case coverage
- Error condition testing

### Integration Tests
- Full compression workflow
- Different PDF types
- Various compression levels
- Error scenario handling

### Performance Tests
- Large file handling (>100MB)
- Memory usage profiling
- Compression speed benchmarks
- Concurrent processing tests

## Deployment

### Installation
```bash
npm install -g pdf-compression-tool
```

### Usage
```bash
# Interactive mode
pdf-compress

# Command-line mode
pdf-compress --file input.pdf --level medium --output output.pdf

# Help
pdf-compress --help
```

## Monitoring and Logging

### Logging Levels
- ERROR: Critical failures
- WARN: Recoverable issues
- INFO: Processing steps
- DEBUG: Detailed debugging

### Metrics Tracked
- Compression ratio
- Processing time
- Memory usage
- Error rates
