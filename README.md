# PDF Compression Tool

A powerful command-line tool for compressing PDF files with configurable compression levels.

## Features

- Three compression levels: Extreme, Medium, Less
- Interactive CLI interface
- File selection from local storage
- Detailed compression statistics
- Cross-platform support

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

### Command-Line Mode
```bash
node src/cli/index.js --file input.pdf --level medium --output output.pdf
```

### Options

- `-f, --file <path>` - Input PDF file path
- `-l, --level <level>` - Compression level: extreme, medium, or less
- `-o, --output <path>` - Output PDF file path (optional)
- `-h, --help` - Display help information

## Compression Levels

### Extreme
- Maximum compression
- Image quality: 40%
- Image DPI: 72
- Removes all metadata
- Best for: Documents where file size is critical

### Medium
- Balanced compression
- Image quality: 70%
- Image DPI: 150
- Keeps basic metadata
- Best for: General purpose compression

### Less
- Minimal compression
- Image quality: 85%
- Image DPI: 300
- Preserves all metadata
- Best for: High-quality document preservation

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system architecture and design decisions.

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

## License

MIT
