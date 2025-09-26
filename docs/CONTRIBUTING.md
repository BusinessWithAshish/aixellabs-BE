# Contributing Guidelines

## Welcome Contributors! 🎉

Thank you for your interest in contributing to the Aixellabs Google Maps Scraping API! This document provides guidelines and information for contributors to help maintain code quality, consistency, and project standards.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. By participating in this project, you agree to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or discriminatory language
- Personal attacks or political discussions
- Public or private harassment
- Publishing private information without permission
- Other unprofessional conduct

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** (LTS recommended)
- **pnpm** package manager
- **Git** version control
- **MongoDB** (local or cloud instance)
- **Chromium** browser (for testing)

### Fork and Clone

1. **Fork the repository**
   ```bash
   # Go to https://github.com/BusinessWithAshish/aixellabs-BE
   # Click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/aixellabs-BE.git
   cd aixellabs-BE
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/BusinessWithAshish/aixellabs-BE.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install

# Install Puppeteer browsers
pnpm run posinstall
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
# Development Configuration
NODE_ENV=development
PORT=8100

# Browser Configuration
MAX_BROWSER_SESSIONS=5
MAX_PAGES_PER_BROWSER=3

# Rate Limiting
RATE_LIMIT_MAX=50

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Database (Optional for development)
MONGODB_URI=mongodb://localhost:27017/aixellabs

# Google Places API (Optional)
GOOGLE_MAPS_PLACES_API_KEY=your_api_key_here
```

### 3. Development Commands

```bash
# Start development server with hot reload
pnpm run build:watch

# In another terminal, start the server
pnpm run start

# Run tests (when implemented)
pnpm test

# Lint code
pnpm run lint

# Format code
pnpm run format

# Type check
pnpm run type-check
```

### 4. IDE Configuration

#### VS Code Setup

Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "auto"
}
```

#### Recommended Extensions

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript Importer**: Auto imports
- **Thunder Client**: API testing
- **MongoDB for VS Code**: Database management

## Contributing Process

### 1. Choose an Issue

- Browse [open issues](https://github.com/BusinessWithAshish/aixellabs-BE/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to express interest
- Wait for maintainer assignment

### 2. Create a Branch

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Write clean, readable code
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit format
git commit -m "feat: add new scraping endpoint for restaurants"

# Push to your fork
git push origin feature/your-feature-name
```

### 5. Create Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Fill out the PR template
- Request review from maintainers

## Code Standards

### TypeScript Guidelines

#### 1. Type Safety

```typescript
// ✅ Good: Explicit types
interface ScrapingRequest {
  query: string;
  country: string;
  states: State[];
}

// ❌ Bad: Any types
function processRequest(data: any): any {
  return data;
}

// ✅ Good: Proper typing
function processRequest(data: ScrapingRequest): ScrapingResult {
  return {
    success: true,
    data: data
  };
}
```

#### 2. Error Handling

```typescript
// ✅ Good: Proper error handling
async function scrapeData(url: string): Promise<ScrapingResult> {
  try {
    const result = await performScraping(url);
    return { success: true, data: result };
  } catch (error) {
    console.error('Scraping failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ❌ Bad: Unhandled errors
async function scrapeData(url: string) {
  const result = await performScraping(url);
  return result; // What if this throws?
}
```

#### 3. Async/Await

```typescript
// ✅ Good: Proper async/await
async function processUrls(urls: string[]): Promise<Result[]> {
  const results: Result[] = [];
  
  for (const url of urls) {
    try {
      const result = await processUrl(url);
      results.push(result);
    } catch (error) {
      console.error(`Failed to process ${url}:`, error);
    }
  }
  
  return results;
}

// ❌ Bad: Promise chains
function processUrls(urls: string[]): Promise<Result[]> {
  return Promise.all(urls.map(url => 
    processUrl(url).catch(error => {
      console.error(`Failed to process ${url}:`, error);
      return null;
    })
  ));
}
```

### Code Style

#### 1. Naming Conventions

```typescript
// ✅ Good: Descriptive names
const MAX_BROWSER_SESSIONS = 10;
const DEFAULT_PAGE_LOAD_TIMEOUT = 15000;

interface TGoogleMapLeadInfo {
  website: string;
  phoneNumber: string;
  name: string;
}

// ❌ Bad: Unclear names
const max = 10;
const timeout = 15000;

interface Data {
  url: string;
  phone: string;
  title: string;
}
```

#### 2. Function Structure

```typescript
// ✅ Good: Single responsibility
export const extractBusinessInfo = async (url: string, page: Page): Promise<BusinessInfo> => {
  await navigateToPage(page, url);
  const html = await page.content();
  return parseBusinessInfo(html);
};

// ❌ Bad: Multiple responsibilities
export const scrapeAndSave = async (url: string, page: Page, db: Database) => {
  // Navigation
  await page.goto(url);
  
  // Scraping
  const html = await page.content();
  const data = parseBusinessInfo(html);
  
  // Database operations
  await db.save(data);
  
  // Logging
  console.log('Saved data');
  
  return data;
};
```

#### 3. Comments and Documentation

```typescript
/**
 * Extracts business information from a Google Maps page
 * @param url - The Google Maps business listing URL
 * @param page - Puppeteer page instance
 * @returns Promise resolving to business information
 * @throws {Error} When page navigation or parsing fails
 */
export const extractBusinessInfo = async (
  url: string, 
  page: Page
): Promise<BusinessInfo> => {
  // Navigate to the business listing page
  await page.goto(url, { waitUntil: "networkidle2" });
  
  // Extract business information from the page
  const businessInfo = await page.evaluate(() => {
    // Implementation details...
  });
  
  return businessInfo;
};
```

### File Organization

#### 1. Import Order

```typescript
// 1. Node.js built-in modules
import { readFileSync } from 'fs';
import { join } from 'path';

// 2. External libraries
import express from 'express';
import puppeteer from 'puppeteer';
import { z } from 'zod';

// 3. Internal modules (absolute imports)
import { BrowserBatchHandler } from '../functions/common/browser-batch-handler';
import { extractBusinessInfo } from '../functions/gmap-details-lead-extractor';

// 4. Relative imports
import { constants } from './constants';
import { helpers } from './helpers';
```

#### 2. Export Patterns

```typescript
// ✅ Good: Named exports
export const extractBusinessInfo = async (url: string, page: Page) => {
  // Implementation
};

export const parseBusinessData = (html: string) => {
  // Implementation
};

// ✅ Good: Default export for main functionality
export default class ScrapingService {
  // Implementation
}

// ❌ Bad: Mixed export patterns
export const extractBusinessInfo = async (url: string, page: Page) => {
  // Implementation
};

export default extractBusinessInfo; // Confusing
```

## Testing Guidelines

### 1. Test Structure

```typescript
// tests/scraping.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractBusinessInfo } from '../src/functions/gmap-details-lead-extractor';

describe('Business Info Extraction', () => {
  let page: Page;
  let browser: Browser;

  beforeEach(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  it('should extract business information from valid URL', async () => {
    // Arrange
    const testUrl = 'https://www.google.com/maps/place/test-business';
    
    // Act
    const result = await extractBusinessInfo(testUrl, page);
    
    // Assert
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('website');
    expect(result).toHaveProperty('phoneNumber');
  });

  it('should handle invalid URLs gracefully', async () => {
    // Arrange
    const invalidUrl = 'https://invalid-url.com';
    
    // Act & Assert
    await expect(extractBusinessInfo(invalidUrl, page))
      .rejects.toThrow('Navigation failed');
  });
});
```

### 2. Mocking Strategies

```typescript
// tests/mocks/puppeteer.mock.ts
export const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  content: vi.fn().mockResolvedValue('<html>Mock HTML</html>'),
  evaluate: vi.fn().mockResolvedValue({
    name: 'Test Business',
    website: 'https://test.com',
    phoneNumber: '+1234567890'
  }),
  close: vi.fn().mockResolvedValue(undefined)
};

export const mockBrowser = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  close: vi.fn().mockResolvedValue(undefined)
};
```

### 3. Integration Tests

```typescript
// tests/integration/api.test.ts
import request from 'supertest';
import { app } from '../src/index';

describe('API Integration Tests', () => {
  it('should handle scraping request', async () => {
    const response = await request(app)
      .post('/gmaps/scrape')
      .send({
        query: 'test query',
        country: 'India',
        states: [{
          name: 'Test State',
          cities: ['Test City']
        }]
      })
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/event-stream/);
  });
});
```

## Documentation Standards

### 1. Code Documentation

```typescript
/**
 * Configuration options for browser launch
 * @interface BrowserOptions
 */
interface BrowserOptions {
  /** Whether to run browser in headless mode */
  headless: boolean | 'shell';
  /** Default viewport settings */
  defaultViewport: Viewport | null;
  /** Path to browser executable */
  executablePath?: string;
  /** Additional browser arguments */
  args: string[];
  /** Launch timeout in milliseconds */
  timeout: number;
}

/**
 * Launches a new browser instance with optimized settings
 * @param options - Browser configuration options
 * @returns Promise resolving to browser instance
 * @example
 * ```typescript
 * const browser = await launchBrowser({
 *   headless: true,
 *   args: ['--no-sandbox']
 * });
 * ```
 */
export const launchBrowser = async (options: BrowserOptions): Promise<Browser> => {
  // Implementation
};
```

### 2. README Updates

When adding new features:

1. Update the main README.md
2. Add usage examples
3. Update API documentation
4. Include configuration options
5. Add troubleshooting information

### 3. API Documentation

```typescript
/**
 * @api {post} /gmaps/scrape Scrape Google Maps
 * @apiName ScrapeGoogleMaps
 * @apiGroup Scraping
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} query Search query for businesses
 * @apiParam {String} country Country name
 * @apiParam {Object[]} states Array of states with cities
 * @apiParam {String} states.name State name
 * @apiParam {String[]} states.cities Array of city names
 * 
 * @apiSuccess {String} type Event type (status|progress|complete|error)
 * @apiSuccess {String} message Human-readable message
 * @apiSuccess {Object} data Event data
 * @apiSuccess {String} timestamp ISO timestamp
 * 
 * @apiExample {json} Request:
 * {
 *   "query": "Digital marketing agencies",
 *   "country": "India",
 *   "states": [{
 *     "name": "Maharashtra",
 *     "cities": ["Pune", "Mumbai"]
 *   }]
 * }
 * 
 * @apiExample {json} Response:
 * {
 *   "type": "complete",
 *   "message": "Scraping completed successfully!",
 *   "data": {
 *     "allLeads": [...],
 *     "allLeadsCount": 10
 *   },
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
```

## Issue Guidelines

### 1. Bug Reports

Use the bug report template:

```markdown
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., Ubuntu 20.04]
- Node.js version: [e.g., 18.17.0]
- Browser: [e.g., Chromium 120.0.0.0]
- API version: [e.g., 1.0.0]

**Additional Context**
Any other context about the problem.
```

### 2. Feature Requests

Use the feature request template:

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Describe the use case and why this feature would be valuable.

**Proposed Solution**
Describe your proposed solution.

**Alternatives Considered**
Describe any alternative solutions you've considered.

**Additional Context**
Any other context or screenshots about the feature request.
```

### 3. Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `question`: Further information is requested
- `wontfix`: This will not be worked on

## Pull Request Process

### 1. PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tests added/updated

## Related Issues
Closes #(issue number)
```

### 2. Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainers review code quality and functionality
3. **Testing**: Manual testing of new features
4. **Documentation**: Ensure documentation is updated
5. **Approval**: At least one maintainer approval required

### 3. Merge Requirements

- All automated checks pass
- At least one maintainer approval
- No merge conflicts
- Up-to-date with main branch
- Proper commit messages

## Release Process

### 1. Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### 2. Release Steps

1. **Update Version**: Update package.json version
2. **Update Changelog**: Document changes in CHANGELOG.md
3. **Create Release**: Create GitHub release with tag
4. **Deploy**: Deploy to production environment
5. **Announce**: Announce release to community

### 3. Changelog Format

```markdown
## [1.2.0] - 2024-01-15

### Added
- New restaurant scraping endpoint
- Support for multiple countries
- Real-time progress streaming

### Changed
- Improved error handling
- Updated browser optimization

### Fixed
- Memory leak in browser management
- Rate limiting issues

### Security
- Updated dependencies
- Fixed XSS vulnerability
```

## Getting Help

### 1. Community Support

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: Real-time community chat (if available)

### 2. Maintainer Contact

- **Email**: [maintainer@example.com]
- **GitHub**: [@maintainer-username]
- **Twitter**: [@maintainer-handle]

### 3. Resources

- **Documentation**: [docs/](./docs/)
- **API Reference**: [docs/API.md](./docs/API.md)
- **Architecture Guide**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## Recognition

Contributors will be recognized in:

- **README.md**: Contributor list
- **CHANGELOG.md**: Release notes
- **GitHub**: Contributor statistics
- **Documentation**: Code examples and references

Thank you for contributing to the Aixellabs Google Maps Scraping API! Your contributions help make this project better for everyone. 🚀