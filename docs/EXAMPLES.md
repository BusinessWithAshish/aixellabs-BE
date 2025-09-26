# Usage Examples

This document provides practical examples of how to use the AixelLabs API for various Google Maps scraping scenarios.

## Table of Contents

- [Basic API Usage](#basic-api-usage)
- [Client Implementations](#client-implementations)
- [Real-World Scenarios](#real-world-scenarios)
- [Error Handling Examples](#error-handling-examples)
- [Performance Optimization](#performance-optimization)

## Basic API Usage

### Simple Restaurant Search

```bash
curl -X POST http://localhost:8100/gmaps/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "restaurants",
    "country": "USA",
    "states": [
      {
        "name": "California",
        "cities": ["Los Angeles", "San Francisco"]
      }
    ]
  }' \
  --no-buffer
```

### Multi-State Business Search

```bash
curl -X POST http://localhost:8100/gmaps/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "digital marketing agencies",
    "country": "India",
    "states": [
      {
        "name": "Maharashtra",
        "cities": ["Mumbai", "Pune", "Nashik"]
      },
      {
        "name": "Gujarat", 
        "cities": ["Ahmedabad", "Surat", "Vadodara"]
      },
      {
        "name": "Karnataka",
        "cities": ["Bangalore", "Mysore"]
      }
    ]
  }' \
  --no-buffer
```

### Google Places API Usage

```bash
curl -X POST http://localhost:8100/gmaps/search_scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "coffee shops",
    "country": "Canada",
    "states": [
      {
        "name": "Ontario",
        "cities": ["Toronto", "Ottawa", "Hamilton"]
      }
    ]
  }'
```

## Client Implementations

### JavaScript/Node.js with Server-Sent Events

```javascript
const EventSource = require('eventsource');

async function scrapeBusiness(query, locations) {
  const response = await fetch('http://localhost:8100/gmaps/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: query,
      country: locations.country,
      states: locations.states
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const results = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'status':
                console.log(`📊 Status: ${data.message}`);
                break;
              case 'progress':
                console.log(`⏳ Progress: ${data.data.percentage}% - ${data.message}`);
                break;
              case 'error':
                console.error(`❌ Error: ${data.message}`);
                break;
              case 'complete':
                console.log('✅ Scraping completed!');
                results.push(...data.data.allLeads);
                return results;
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', parseError);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return results;
}

// Usage example
const locations = {
  country: "USA",
  states: [
    {
      name: "Texas",
      cities: ["Houston", "Dallas", "Austin"]
    }
  ]
};

scrapeBusiness("law firms", locations)
  .then(results => {
    console.log(`Found ${results.length} businesses:`);
    results.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name}`);
      console.log(`   Phone: ${business.phoneNumber}`);
      console.log(`   Website: ${business.website}`);
      console.log(`   Rating: ${business.overAllRating} (${business.numberOfReviews} reviews)`);
      console.log('');
    });
  })
  .catch(error => {
    console.error('Scraping failed:', error);
  });
```

### Python with Requests

```python
import requests
import json
import time

def scrape_businesses(query, country, states, progress_callback=None):
    """
    Scrape businesses using the AixelLabs API with real-time progress updates.
    
    Args:
        query (str): Business type to search for
        country (str): Country name
        states (list): List of state objects with cities
        progress_callback (function): Optional callback for progress updates
    
    Returns:
        list: List of scraped business data
    """
    url = 'http://localhost:8100/gmaps/scrape'
    data = {
        'query': query,
        'country': country,
        'states': states
    }
    
    try:
        response = requests.post(url, json=data, stream=True)
        response.raise_for_status()
        
        results = []
        for line in response.iter_lines(decode_unicode=True):
            if line.startswith('data: '):
                try:
                    event_data = json.loads(line[6:])
                    
                    if progress_callback:
                        progress_callback(event_data)
                    
                    if event_data['type'] == 'complete':
                        results = event_data['data']['allLeads']
                        break
                    elif event_data['type'] == 'error':
                        print(f"Error: {event_data['message']}")
                        
                except json.JSONDecodeError:
                    continue
        
        return results
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return []

def progress_handler(event):
    """Handle progress updates from the API"""
    if event['type'] == 'status':
        print(f"📊 {event['message']}")
    elif event['type'] == 'progress':
        percentage = event['data'].get('percentage', 0)
        print(f"⏳ Progress: {percentage}%")

# Usage example
states_data = [
    {
        "name": "Florida",
        "cities": ["Miami", "Tampa", "Orlando", "Jacksonville"]
    },
    {
        "name": "Georgia", 
        "cities": ["Atlanta", "Savannah", "Columbus"]
    }
]

print("Starting business scraping...")
businesses = scrape_businesses(
    query="real estate agents",
    country="USA", 
    states=states_data,
    progress_callback=progress_handler
)

print(f"\n✅ Scraping completed! Found {len(businesses)} businesses:")
for i, business in enumerate(businesses, 1):
    print(f"{i}. {business['name']}")
    print(f"   📞 {business['phoneNumber']}")
    print(f"   🌐 {business['website']}")
    print(f"   ⭐ {business['overAllRating']} ({business['numberOfReviews']} reviews)")
    print(f"   📍 {business['gmapsUrl']}")
    print()
```

### React.js Component

```jsx
import React, { useState, useEffect } from 'react';

const BusinessScraper = () => {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('USA');
  const [states, setStates] = useState([{ name: '', cities: [''] }]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const addState = () => {
    setStates([...states, { name: '', cities: [''] }]);
  };

  const addCity = (stateIndex) => {
    const newStates = [...states];
    newStates[stateIndex].cities.push('');
    setStates(newStates);
  };

  const updateState = (index, field, value) => {
    const newStates = [...states];
    newStates[index][field] = value;
    setStates(newStates);
  };

  const updateCity = (stateIndex, cityIndex, value) => {
    const newStates = [...states];
    newStates[stateIndex].cities[cityIndex] = value;
    setStates(newStates);
  };

  const startScraping = async () => {
    setIsLoading(true);
    setResults([]);
    setProgress(0);
    setStatus('Initializing...');

    try {
      const response = await fetch('/gmaps/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          country,
          states: states.filter(s => s.name && s.cities.some(c => c))
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'status':
                  setStatus(data.message);
                  break;
                case 'progress':
                  setProgress(data.data.percentage || 0);
                  setStatus(data.message);
                  break;
                case 'complete':
                  setResults(data.data.allLeads || []);
                  setStatus('Scraping completed successfully!');
                  setIsLoading(false);
                  return;
                case 'error':
                  setStatus(`Error: ${data.message}`);
                  break;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="business-scraper">
      <h2>Google Maps Business Scraper</h2>
      
      <div className="form-section">
        <label>
          Business Query:
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., restaurants, hotels, law firms"
          />
        </label>

        <label>
          Country:
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., USA, India, Canada"
          />
        </label>

        <div className="states-section">
          <h3>States and Cities</h3>
          {states.map((state, stateIndex) => (
            <div key={stateIndex} className="state-group">
              <input
                type="text"
                value={state.name}
                onChange={(e) => updateState(stateIndex, 'name', e.target.value)}
                placeholder="State name"
              />
              
              <div className="cities-group">
                {state.cities.map((city, cityIndex) => (
                  <input
                    key={cityIndex}
                    type="text"
                    value={city}
                    onChange={(e) => updateCity(stateIndex, cityIndex, e.target.value)}
                    placeholder="City name"
                  />
                ))}
                <button onClick={() => addCity(stateIndex)}>Add City</button>
              </div>
            </div>
          ))}
          <button onClick={addState}>Add State</button>
        </div>

        <button 
          onClick={startScraping} 
          disabled={isLoading || !query || !country}
          className="scrape-button"
        >
          {isLoading ? 'Scraping...' : 'Start Scraping'}
        </button>
      </div>

      {isLoading && (
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="status">{status}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="results-section">
          <h3>Results ({results.length} businesses found)</h3>
          <div className="results-grid">
            {results.map((business, index) => (
              <div key={index} className="business-card">
                <h4>{business.name}</h4>
                <p><strong>Phone:</strong> {business.phoneNumber}</p>
                <p><strong>Website:</strong> 
                  {business.website !== 'N/A' ? (
                    <a href={business.website} target="_blank" rel="noopener noreferrer">
                      {business.website}
                    </a>
                  ) : 'N/A'}
                </p>
                <p><strong>Rating:</strong> {business.overAllRating} ({business.numberOfReviews} reviews)</p>
                <p>
                  <a href={business.gmapsUrl} target="_blank" rel="noopener noreferrer">
                    View on Google Maps
                  </a>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessScraper;
```

## Real-World Scenarios

### Lead Generation for Marketing Agency

```python
import requests
import json
import csv
from datetime import datetime

class LeadGenerator:
    def __init__(self, api_base_url="http://localhost:8100"):
        self.api_base_url = api_base_url
    
    def generate_leads(self, business_types, locations, output_file=None):
        """
        Generate leads for multiple business types across multiple locations
        """
        all_leads = []
        
        for business_type in business_types:
            print(f"\n🔍 Searching for: {business_type}")
            
            leads = self.scrape_business_type(business_type, locations)
            
            # Add metadata
            for lead in leads:
                lead['business_type'] = business_type
                lead['scraped_date'] = datetime.now().isoformat()
            
            all_leads.extend(leads)
            print(f"✅ Found {len(leads)} {business_type}")
        
        # Save to CSV if requested
        if output_file:
            self.save_to_csv(all_leads, output_file)
        
        return all_leads
    
    def scrape_business_type(self, business_type, locations):
        """Scrape a specific business type"""
        url = f"{self.api_base_url}/gmaps/scrape"
        data = {
            'query': business_type,
            'country': locations['country'],
            'states': locations['states']
        }
        
        try:
            response = requests.post(url, json=data, stream=True)
            response.raise_for_status()
            
            for line in response.iter_lines(decode_unicode=True):
                if line.startswith('data: '):
                    try:
                        event_data = json.loads(line[6:])
                        if event_data['type'] == 'complete':
                            return event_data['data']['allLeads']
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"❌ Error scraping {business_type}: {e}")
        
        return []
    
    def save_to_csv(self, leads, filename):
        """Save leads to CSV file"""
        if not leads:
            return
        
        fieldnames = [
            'name', 'phoneNumber', 'website', 'overAllRating', 
            'numberOfReviews', 'gmapsUrl', 'business_type', 'scraped_date'
        ]
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(leads)
        
        print(f"💾 Saved {len(leads)} leads to {filename}")

# Usage example
generator = LeadGenerator()

# Target business types
business_types = [
    "digital marketing agencies",
    "web design companies", 
    "SEO services",
    "social media marketing",
    "advertising agencies"
]

# Target locations
locations = {
    "country": "USA",
    "states": [
        {
            "name": "California",
            "cities": ["Los Angeles", "San Francisco", "San Diego", "Sacramento"]
        },
        {
            "name": "New York", 
            "cities": ["New York City", "Buffalo", "Albany", "Rochester"]
        },
        {
            "name": "Texas",
            "cities": ["Houston", "Dallas", "Austin", "San Antonio"]
        }
    ]
}

# Generate leads
leads = generator.generate_leads(
    business_types=business_types,
    locations=locations,
    output_file=f"leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
)

print(f"\n🎉 Total leads generated: {len(leads)}")

# Analyze results
business_counts = {}
for lead in leads:
    btype = lead['business_type']
    business_counts[btype] = business_counts.get(btype, 0) + 1

print("\n📊 Results by business type:")
for btype, count in business_counts.items():
    print(f"  {btype}: {count} leads")
```

### Competitive Analysis Tool

```javascript
class CompetitorAnalyzer {
  constructor(apiBaseUrl = 'http://localhost:8100') {
    this.apiBaseUrl = apiBaseUrl;
  }

  async analyzeCompetitors(businessType, targetLocations, filters = {}) {
    console.log(`🔍 Analyzing competitors for: ${businessType}`);
    
    const competitors = await this.scrapeCompetitors(businessType, targetLocations);
    const analysis = this.analyzeResults(competitors, filters);
    
    return {
      totalCompetitors: competitors.length,
      analysis: analysis,
      rawData: competitors
    };
  }

  async scrapeCompetitors(businessType, locations) {
    const response = await fetch(`${this.apiBaseUrl}/gmaps/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: businessType,
        country: locations.country,
        states: locations.states
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'complete') {
              return data.data.allLeads || [];
            }
          } catch (e) {
            continue;
          }
        }
      }
    }

    return [];
  }

  analyzeResults(competitors, filters = {}) {
    const analysis = {
      byRating: this.groupByRating(competitors),
      byReviewCount: this.groupByReviewCount(competitors),
      withWebsites: competitors.filter(c => c.website !== 'N/A').length,
      withPhones: competitors.filter(c => c.phoneNumber !== 'N/A').length,
      topRated: this.getTopRated(competitors, 10),
      mostReviewed: this.getMostReviewed(competitors, 10)
    };

    // Apply filters
    if (filters.minRating) {
      analysis.highRated = competitors.filter(c => 
        parseFloat(c.overAllRating) >= filters.minRating
      );
    }

    if (filters.minReviews) {
      analysis.wellReviewed = competitors.filter(c => 
        parseInt(c.numberOfReviews) >= filters.minReviews
      );
    }

    return analysis;
  }

  groupByRating(competitors) {
    const groups = { '4.5+': [], '4.0-4.4': [], '3.5-3.9': [], '3.0-3.4': [], 'Below 3.0': [], 'No Rating': [] };
    
    competitors.forEach(comp => {
      const rating = parseFloat(comp.overAllRating);
      if (isNaN(rating)) {
        groups['No Rating'].push(comp);
      } else if (rating >= 4.5) {
        groups['4.5+'].push(comp);
      } else if (rating >= 4.0) {
        groups['4.0-4.4'].push(comp);
      } else if (rating >= 3.5) {
        groups['3.5-3.9'].push(comp);
      } else if (rating >= 3.0) {
        groups['3.0-3.4'].push(comp);
      } else {
        groups['Below 3.0'].push(comp);
      }
    });

    return Object.fromEntries(
      Object.entries(groups).map(([key, value]) => [key, value.length])
    );
  }

  groupByReviewCount(competitors) {
    const groups = { '100+': [], '50-99': [], '20-49': [], '10-19': [], '1-9': [], 'No Reviews': [] };
    
    competitors.forEach(comp => {
      const reviews = parseInt(comp.numberOfReviews);
      if (isNaN(reviews)) {
        groups['No Reviews'].push(comp);
      } else if (reviews >= 100) {
        groups['100+'].push(comp);
      } else if (reviews >= 50) {
        groups['50-99'].push(comp);
      } else if (reviews >= 20) {
        groups['20-49'].push(comp);
      } else if (reviews >= 10) {
        groups['10-19'].push(comp);
      } else if (reviews >= 1) {
        groups['1-9'].push(comp);
      } else {
        groups['No Reviews'].push(comp);
      }
    });

    return Object.fromEntries(
      Object.entries(groups).map(([key, value]) => [key, value.length])
    );
  }

  getTopRated(competitors, limit = 10) {
    return competitors
      .filter(c => c.overAllRating !== 'N/A')
      .sort((a, b) => parseFloat(b.overAllRating) - parseFloat(a.overAllRating))
      .slice(0, limit);
  }

  getMostReviewed(competitors, limit = 10) {
    return competitors
      .filter(c => c.numberOfReviews !== 'N/A')
      .sort((a, b) => parseInt(b.numberOfReviews) - parseInt(a.numberOfReviews))
      .slice(0, limit);
  }

  generateReport(analysisResult) {
    const { totalCompetitors, analysis } = analysisResult;
    
    console.log(`\n📊 COMPETITOR ANALYSIS REPORT`);
    console.log(`=================================`);
    console.log(`Total Competitors Found: ${totalCompetitors}`);
    
    console.log(`\n🌟 Rating Distribution:`);
    Object.entries(analysis.byRating).forEach(([range, count]) => {
      console.log(`  ${range}: ${count} businesses`);
    });
    
    console.log(`\n💬 Review Count Distribution:`);
    Object.entries(analysis.byReviewCount).forEach(([range, count]) => {
      console.log(`  ${range}: ${count} businesses`);
    });
    
    console.log(`\n📞 Contact Information:`);
    console.log(`  With Websites: ${analysis.withWebsites}/${totalCompetitors} (${((analysis.withWebsites/totalCompetitors)*100).toFixed(1)}%)`);
    console.log(`  With Phone Numbers: ${analysis.withPhones}/${totalCompetitors} (${((analysis.withPhones/totalCompetitors)*100).toFixed(1)}%)`);
    
    console.log(`\n🏆 Top 5 Highest Rated:`);
    analysis.topRated.slice(0, 5).forEach((comp, index) => {
      console.log(`  ${index + 1}. ${comp.name} - ${comp.overAllRating}⭐ (${comp.numberOfReviews} reviews)`);
    });
    
    console.log(`\n📈 Top 5 Most Reviewed:`);
    analysis.mostReviewed.slice(0, 5).forEach((comp, index) => {
      console.log(`  ${index + 1}. ${comp.name} - ${comp.numberOfReviews} reviews (${comp.overAllRating}⭐)`);
    });
  }
}

// Usage example
const analyzer = new CompetitorAnalyzer();

const locations = {
  country: "USA",
  states: [
    {
      name: "California",
      cities: ["San Francisco", "Los Angeles", "San Diego"]
    }
  ]
};

analyzer.analyzeCompetitors("coffee shops", locations, {
  minRating: 4.0,
  minReviews: 50
}).then(result => {
  analyzer.generateReport(result);
  
  // Save detailed results
  const fs = require('fs');
  fs.writeFileSync(
    `competitor_analysis_${Date.now()}.json`, 
    JSON.stringify(result, null, 2)
  );
  console.log('\n💾 Detailed results saved to file');
}).catch(error => {
  console.error('Analysis failed:', error);
});
```

## Error Handling Examples

### Robust Error Handling with Retry Logic

```python
import requests
import json
import time
from typing import List, Dict, Optional

class RobustScraper:
    def __init__(self, api_base_url: str = "http://localhost:8100", max_retries: int = 3):
        self.api_base_url = api_base_url
        self.max_retries = max_retries
    
    def scrape_with_retry(self, query: str, country: str, states: List[Dict], 
                         retry_delay: int = 5) -> Optional[List[Dict]]:
        """
        Scrape with automatic retry logic for handling temporary failures
        """
        for attempt in range(self.max_retries):
            try:
                print(f"🔄 Attempt {attempt + 1}/{self.max_retries} for query: {query}")
                
                result = self.scrape_businesses(query, country, states)
                
                if result is not None:
                    print(f"✅ Success on attempt {attempt + 1}")
                    return result
                
            except requests.exceptions.ConnectionError:
                print(f"❌ Connection error on attempt {attempt + 1}")
                if attempt < self.max_retries - 1:
                    print(f"⏳ Waiting {retry_delay} seconds before retry...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    
            except requests.exceptions.Timeout:
                print(f"⏰ Timeout error on attempt {attempt + 1}")
                if attempt < self.max_retries - 1:
                    print(f"⏳ Waiting {retry_delay} seconds before retry...")
                    time.sleep(retry_delay)
                    
            except Exception as e:
                print(f"💥 Unexpected error on attempt {attempt + 1}: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(retry_delay)
        
        print(f"🚫 All {self.max_retries} attempts failed for query: {query}")
        return None
    
    def scrape_businesses(self, query: str, country: str, states: List[Dict], 
                         timeout: int = 300) -> Optional[List[Dict]]:
        """
        Core scraping function with comprehensive error handling
        """
        url = f"{self.api_base_url}/gmaps/scrape"
        data = {
            'query': query,
            'country': country,
            'states': states
        }
        
        try:
            response = requests.post(
                url, 
                json=data, 
                stream=True, 
                timeout=timeout,
                headers={'Connection': 'keep-alive'}
            )
            
            # Check for HTTP errors
            response.raise_for_status()
            
            # Process SSE stream
            results = []
            error_messages = []
            start_time = time.time()
            
            for line in response.iter_lines(decode_unicode=True, chunk_size=1024):
                # Check for timeout
                if time.time() - start_time > timeout:
                    raise requests.exceptions.Timeout("Stream processing timeout")
                
                if line.startswith('data: '):
                    try:
                        event_data = json.loads(line[6:])
                        
                        if event_data['type'] == 'complete':
                            results = event_data['data'].get('allLeads', [])
                            success_count = event_data['data'].get('allLeadsCount', 0)
                            print(f"✅ Scraping completed: {success_count} results")
                            return results
                            
                        elif event_data['type'] == 'error':
                            error_msg = event_data['message']
                            error_messages.append(error_msg)
                            print(f"⚠️ Stream error: {error_msg}")
                            
                        elif event_data['type'] == 'progress':
                            percentage = event_data['data'].get('percentage', 0)
                            if percentage % 10 == 0:  # Log every 10%
                                print(f"📊 Progress: {percentage}%")
                                
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Failed to parse SSE data: {e}")
                        continue
            
            # If we get here, stream ended without completion
            if error_messages:
                print(f"❌ Stream ended with errors: {'; '.join(error_messages)}")
            else:
                print("❌ Stream ended unexpectedly without completion")
            
            return None
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                print("🚫 Rate limit exceeded - waiting before retry")
                time.sleep(60)  # Wait 1 minute for rate limit reset
            else:
                print(f"🚫 HTTP error {e.response.status_code}: {e}")
            raise
            
        except requests.exceptions.ConnectionError:
            print("🔌 Connection error - server may be down")
            raise
            
        except requests.exceptions.Timeout:
            print("⏰ Request timeout - server may be overloaded")
            raise
            
        except Exception as e:
            print(f"💥 Unexpected error: {e}")
            raise

# Usage with error handling
scraper = RobustScraper(max_retries=3)

# Test data
test_queries = [
    "restaurants",
    "hotels", 
    "gas stations",
    "pharmacies"
]

locations = {
    "country": "USA",
    "states": [
        {
            "name": "Nevada",
            "cities": ["Las Vegas", "Reno"]
        }
    ]
}

# Process multiple queries with error handling
all_results = {}
for query in test_queries:
    print(f"\n{'='*50}")
    print(f"Processing: {query}")
    print(f"{'='*50}")
    
    results = scraper.scrape_with_retry(
        query=query,
        country=locations["country"],
        states=locations["states"]
    )
    
    if results:
        all_results[query] = results
        print(f"✅ {query}: {len(results)} businesses found")
    else:
        print(f"❌ {query}: Failed to get results")

# Summary
print(f"\n📋 FINAL SUMMARY")
print(f"{'='*30}")
total_businesses = sum(len(results) for results in all_results.values())
print(f"Successful queries: {len(all_results)}/{len(test_queries)}")
print(f"Total businesses found: {total_businesses}")

for query, results in all_results.items():
    print(f"  {query}: {len(results)} businesses")
```

## Performance Optimization

### Batch Processing for Large Datasets

```python
import asyncio
import aiohttp
import json
from typing import List, Dict
import time

class OptimizedScraper:
    def __init__(self, api_base_url: str = "http://localhost:8100", 
                 concurrent_requests: int = 3):
        self.api_base_url = api_base_url
        self.concurrent_requests = concurrent_requests
        self.semaphore = asyncio.Semaphore(concurrent_requests)
    
    async def scrape_multiple_queries(self, queries: List[str], locations: Dict) -> Dict:
        """
        Scrape multiple business types concurrently with rate limiting
        """
        print(f"🚀 Starting concurrent scraping of {len(queries)} queries")
        print(f"📊 Concurrency limit: {self.concurrent_requests}")
        
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=600)  # 10 minute timeout
        ) as session:
            tasks = [
                self.scrape_single_query(session, query, locations) 
                for query in queries
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            successful_results = {}
            failed_queries = []
            
            for i, result in enumerate(results):
                query = queries[i]
                if isinstance(result, Exception):
                    print(f"❌ {query} failed: {result}")
                    failed_queries.append(query)
                else:
                    successful_results[query] = result
                    print(f"✅ {query}: {len(result)} businesses")
            
            return {
                'successful': successful_results,
                'failed': failed_queries,
                'total_businesses': sum(len(r) for r in successful_results.values())
            }
    
    async def scrape_single_query(self, session: aiohttp.ClientSession, 
                                 query: str, locations: Dict) -> List[Dict]:
        """
        Scrape a single query with semaphore-based rate limiting
        """
        async with self.semaphore:  # Limit concurrent requests
            print(f"🔍 Starting: {query}")
            
            data = {
                'query': query,
                'country': locations['country'],
                'states': locations['states']
            }
            
            try:
                async with session.post(
                    f"{self.api_base_url}/gmaps/scrape",
                    json=data
                ) as response:
                    
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}")
                    
                    results = []
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        
                        if line_str.startswith('data: '):
                            try:
                                event_data = json.loads(line_str[6:])
                                
                                if event_data['type'] == 'complete':
                                    results = event_data['data'].get('allLeads', [])
                                    break
                                elif event_data['type'] == 'progress':
                                    percentage = event_data['data'].get('percentage', 0)
                                    if percentage % 25 == 0:  # Log every 25%
                                        print(f"📊 {query}: {percentage}% complete")
                                        
                            except json.JSONDecodeError:
                                continue
                    
                    return results
                    
            except Exception as e:
                print(f"❌ Error scraping {query}: {e}")
                raise

# Usage example for large-scale scraping
async def main():
    scraper = OptimizedScraper(concurrent_requests=2)  # Conservative limit
    
    # Large list of business types
    business_queries = [
        "restaurants", "hotels", "gas stations", "pharmacies", 
        "banks", "hospitals", "schools", "gyms", "hair salons",
        "auto repair", "dentists", "lawyers", "real estate agents",
        "insurance agents", "accountants", "veterinarians",
        "plumbers", "electricians", "contractors", "landscapers"
    ]
    
    # Multiple locations
    locations = {
        "country": "USA",
        "states": [
            {
                "name": "Florida",
                "cities": ["Miami", "Tampa", "Orlando"]
            },
            {
                "name": "Arizona", 
                "cities": ["Phoenix", "Tucson"]
            }
        ]
    }
    
    start_time = time.time()
    
    # Process all queries
    results = await scraper.scrape_multiple_queries(business_queries, locations)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Results summary
    print(f"\n{'='*60}")
    print(f"🎉 SCRAPING COMPLETED")
    print(f"{'='*60}")
    print(f"⏱️  Total time: {duration:.2f} seconds")
    print(f"✅ Successful queries: {len(results['successful'])}")
    print(f"❌ Failed queries: {len(results['failed'])}")
    print(f"📊 Total businesses found: {results['total_businesses']}")
    print(f"⚡ Average time per query: {duration/len(business_queries):.2f} seconds")
    
    # Detailed breakdown
    print(f"\n📋 DETAILED RESULTS:")
    for query, businesses in results['successful'].items():
        print(f"  {query}: {len(businesses)} businesses")
    
    if results['failed']:
        print(f"\n❌ FAILED QUERIES:")
        for query in results['failed']:
            print(f"  {query}")

# Run the async scraper
if __name__ == "__main__":
    asyncio.run(main())
```

### Memory-Efficient Processing

```javascript
class MemoryEfficientScraper {
  constructor(apiBaseUrl = 'http://localhost:8100') {
    this.apiBaseUrl = apiBaseUrl;
    this.results = new Map(); // Use Map for better memory management
    this.processedCount = 0;
  }

  async scrapeWithStreaming(queries, locations, onBusinessFound, onProgress) {
    console.log(`🔄 Processing ${queries.length} queries with streaming...`);
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`\n📍 Processing ${i + 1}/${queries.length}: ${query}`);
      
      try {
        await this.streamSingleQuery(query, locations, onBusinessFound, onProgress);
        
        // Force garbage collection hint (if available)
        if (global.gc) {
          global.gc();
        }
        
        // Small delay between queries to prevent overwhelming
        await this.sleep(1000);
        
      } catch (error) {
        console.error(`❌ Failed to process ${query}:`, error);
      }
    }
    
    console.log(`\n✅ Completed processing ${this.processedCount} businesses`);
  }

  async streamSingleQuery(query, locations, onBusinessFound, onProgress) {
    const response = await fetch(`${this.apiBaseUrl}/gmaps/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        country: locations.country,
        states: locations.states
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress' && onProgress) {
                onProgress(query, data.data.percentage || 0);
              } else if (data.type === 'complete') {
                const businesses = data.data.allLeads || [];
                
                // Process businesses one by one to save memory
                for (const business of businesses) {
                  business.query = query; // Add query context
                  business.processedAt = new Date().toISOString();
                  
                  if (onBusinessFound) {
                    await onBusinessFound(business);
                  }
                  
                  this.processedCount++;
                }
                
                return; // Complete this query
              }
            } catch (parseError) {
              // Ignore parse errors for individual lines
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage with memory-efficient callbacks
const scraper = new MemoryEfficientScraper();

// Database-like storage simulation
const businessDatabase = [];
const businessIndex = new Map(); // For fast lookups

// Callback for each business found
async function onBusinessFound(business) {
  // Check for duplicates using phone number or name
  const key = business.phoneNumber !== 'N/A' ? business.phoneNumber : business.name;
  
  if (!businessIndex.has(key)) {
    businessIndex.set(key, businessDatabase.length);
    businessDatabase.push(business);
    
    // Optional: Save to file immediately for very large datasets
    // await appendToFile('businesses.jsonl', JSON.stringify(business) + '\n');
    
    // Log every 100 businesses
    if (businessDatabase.length % 100 === 0) {
      console.log(`💾 Stored ${businessDatabase.length} unique businesses`);
    }
  }
}

// Callback for progress updates
function onProgress(query, percentage) {
  if (percentage % 20 === 0) { // Log every 20%
    console.log(`📊 ${query}: ${percentage}% complete`);
  }
}

// Large-scale processing
const businessTypes = [
  "restaurants", "hotels", "retail stores", "service businesses",
  "healthcare providers", "professional services", "automotive services",
  "home services", "beauty salons", "fitness centers"
];

const locations = {
  country: "USA",
  states: [
    { name: "California", cities: ["Los Angeles", "San Francisco", "San Diego"] },
    { name: "Texas", cities: ["Houston", "Dallas", "Austin"] },
    { name: "New York", cities: ["New York City", "Buffalo", "Rochester"] }
  ]
};

// Start processing
scraper.scrapeWithStreaming(
  businessTypes, 
  locations, 
  onBusinessFound, 
  onProgress
).then(() => {
  console.log(`\n🎉 Final Results:`);
  console.log(`📊 Total unique businesses: ${businessDatabase.length}`);
  console.log(`🗂️  Memory usage: ${process.memoryUsage().heapUsed / 1024 / 1024:.2f} MB`);
  
  // Analyze results
  const queryStats = {};
  businessDatabase.forEach(business => {
    queryStats[business.query] = (queryStats[business.query] || 0) + 1;
  });
  
  console.log(`\n📈 Results by query:`);
  Object.entries(queryStats).forEach(([query, count]) => {
    console.log(`  ${query}: ${count} businesses`);
  });
  
}).catch(error => {
  console.error('Processing failed:', error);
});
```

These examples demonstrate various real-world usage scenarios for the AixelLabs API, from simple lead generation to complex competitive analysis and large-scale data processing with proper error handling and performance optimization.