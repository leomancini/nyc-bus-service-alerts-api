# NYC Bus Service Alerts API

Identifier: nyc-bus-service-alerts-api

Created: Tue 02 Sep 2025 12:29:25 AM EDT

## API Endpoints

### `/alerts`

Returns detailed bus service alerts with full information.

### `/summaries`

Returns concise summaries optimized for LCD displays and character-limited screens.

## URL Parameters

### Required Parameters

- **`apiKey`** - Your API key for authentication

### Optional Parameters

#### Route Filtering

- **`routes`** - Filter alerts by bus route prefix (default: `"Q"`)
  - Examples: `"B"` for Brooklyn, `"M"` for Manhattan, `"BX"` for Bronx, `"S"` for Staten Island
  - Use `"ALL"` to show all routes

#### Time Filtering

- **`maxDuration`** - Maximum alert duration in days (default: no limit)
  - Only shows alerts that are active for this many days or fewer

#### Summaries Endpoint Only

- **`maxCharacters`** - Maximum characters per line for LCD formatting (default: no limit)
- **`maxStrings`** - Maximum number of summary strings to return (default: `50`)

## Example Usage

```bash
# Queens buses only (default)
GET /alerts?apiKey=yourkey

# Brooklyn buses with 7-day duration limit
GET /alerts?apiKey=yourkey&routes=B&maxDuration=7

# All buses
GET /alerts?apiKey=yourkey&routes=ALL

# LCD summaries for Queens buses, 40 chars per line, max 10 summaries
GET /summaries?apiKey=yourkey&maxCharacters=40&maxStrings=10

# Manhattan buses with custom formatting
GET /summaries?apiKey=yourkey&routes=M&maxCharacters=20&maxDuration=3
```
