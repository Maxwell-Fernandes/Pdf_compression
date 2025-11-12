# PDF Compression Tool

A powerful command-line tool for compressing PDF files with configurable compression levels.

## Features

- **Three compression levels**: Extreme, Medium, Less
- **Interactive CLI interface**: User-friendly prompts
- **Batch processing**: Compress multiple PDFs at once
- **Advanced compression**:
  - Image optimization with Sharp
  - Stream compression with zlib
  - Font subsetting
  - Metadata stripping
- **Detailed statistics**: View compression metrics
- **Cross-platform support**: Works on Windows, macOS, and Linux

## Installation

```bash
npm install
```

## Usage

### Interactive Mode
```bash
npm start
```

The tool will prompt you to:
1. Select a PDF file from your local storage
2. Choose compression level (extreme/medium/less)
3. Specify output location (optional)

### Single File Mode
```bash
node src/cli/index.js --file input.pdf --level medium --output output.pdf
```

### Batch Processing Mode

Compress all PDFs in a directory:
```bash
node src/cli/index.js --batch /path/to/pdfs --level medium --output-dir /path/to/output
```

Compress PDFs matching a pattern:
```bash
node src/cli/index.js --batch "documents/**/*.pdf" --level extreme --recursive
```

Compress and overwrite existing files:
```bash
node src/cli/index.js --batch /path/to/pdfs --level medium --overwrite
```

### Options

**Single File Mode:**
- `-f, --file <path>` - Input PDF file path
- `-l, --level <level>` - Compression level: extreme, medium, or less
- `-o, --output <path>` - Output PDF file path (optional)

**Batch Mode:**
- `-b, --batch <pattern>` - Batch process multiple files (glob pattern or directory)
- `-l, --level <level>` - Compression level (required)
- `-d, --output-dir <dir>` - Output directory for batch processing
- `-r, --recursive` - Recursively search for PDFs in subdirectories
- `--overwrite` - Overwrite existing output files

**General:**
- `-h, --help` - Display help information
- `-V, --version` - Display version number

## Compression Levels

| Feature | Extreme | Medium | Less |
|---------|---------|--------|------|
| **Image Quality** | 40% | 70% | 85% |
| **Image DPI** | 72 | 150 | 300 |
| **Metadata Removal** | All removed | Partial | Preserved |
| **Font Subsetting** | Yes | Yes | No |
| **Stream Compression** | Maximum | Moderate | Minimal |
| **Best For** | Smallest file size | Balanced quality/size | High quality |

### Extreme
- Maximum compression for smallest file size
- Aggressive image compression (40% quality, 72 DPI)
- Removes all metadata (including author, title, dates)
- Font subsetting enabled
- Maximum stream compression
- **Use case**: Email attachments, web uploads, archival storage

### Medium
- Balanced compression maintaining good quality
- Moderate image compression (70% quality, 150 DPI)
- Keeps basic metadata (title, author)
- Font subsetting enabled
- Moderate stream compression
- **Use case**: General document sharing, presentations

### Less
- Minimal compression preserving quality
- Light image compression (85% quality, 300 DPI)
- Preserves all metadata
- No font subsetting
- Minimal stream compression
- **Use case**: Professional printing, high-quality archival

## Examples

### Example 1: Compress a single PDF
```bash
node src/cli/index.js -f document.pdf -l medium
# Output: document_compressed.pdf
```

### Example 2: Compress with custom output
```bash
node src/cli/index.js -f large.pdf -l extreme -o small.pdf
```

### Example 3: Batch compress all PDFs in a directory
```bash
node src/cli/index.js -b ./documents -l medium -d ./compressed
```

### Example 4: Recursively compress PDFs
```bash
node src/cli/index.js -b ./projects -l extreme -r -d ./output
```

## Compression Techniques

The tool uses multiple advanced techniques to reduce PDF file size:

### 1. Image Compression
- Extracts embedded images
- Resizes based on target DPI
- Re-compresses using JPEG with quality settings
- Re-embeds optimized images

### 2. Stream Optimization
- Applies Flate (zlib) compression to content streams
- Removes redundant PDF operators
- Optimizes object streams

### 3. Font Subsetting
- Identifies used characters in the document
- Creates font subsets with only required glyphs
- Removes unused font data

### 4. Metadata Removal
- Strips XMP metadata
- Removes document information (configurable)
- Deletes embedded thumbnails
- Cleans custom metadata fields

### 5. Object Deduplication
- Identifies duplicate objects in PDF structure
- Merges identical objects
- Reduces file redundancy

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system architecture and design decisions.

## Performance

Typical compression results:

| Document Type | Original Size | Compressed (Medium) | Savings |
|--------------|---------------|---------------------|---------|
| Scanned document (images) | 50 MB | 8 MB | 84% |
| Mixed content | 10 MB | 4 MB | 60% |
| Text-heavy | 5 MB | 3 MB | 40% |

*Results vary based on PDF content and compression level*

## Development

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

### Debug Mode
Set `DEBUG` environment variable for detailed logging:
```bash
DEBUG=1 node src/cli/index.js -f test.pdf -l medium
```

## Troubleshooting

### PDF Fails to Compress
- Ensure PDF is not encrypted or password-protected
- Check if PDF is corrupted using a PDF reader
- Try with a different compression level

### Output File is Larger
- Some PDFs are already optimized
- Try a different compression level
- Check if PDF has already compressed images

### Permission Denied
- Check file permissions
- Ensure output directory is writable
- Run with appropriate permissions

## License

MIT
