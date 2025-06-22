# Patch Notes Summarizer API

This project provides an API endpoint to fetch and summarize game patch notes. It utilizes `cheerio` for HTML parsing and the Google Gemini API for generating concise summaries.

---

## Features

- Fetches raw HTML patch notes from a specified endpoint.
- Extracts and cleans relevant patch information from the HTML.
- Summarizes important changes into a single, clear paragraph using the Google Gemini API.
- Provides a simple RESTful API endpoint for easy access.

---

## Technologies Used

- **Express.js**: Fast, unopinionated, minimalist web framework for Node.js.
- **dotenv**: Loads environment variables from a `.env` file.
- **@google/generative-ai**: Google Gemini API client library.
- **cors**: Middleware to enable Cross-Origin Resource Sharing.
- **cheerio**: Fast, flexible, and lean implementation of core jQuery specifically designed for the server.

---

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

Make sure you have the following installed:

- Node.js (LTS recommended)
- npm or Yarn

### Installation

1.  **Clone the repository:**

    ```bash
    git clone 
    cd <your-repository-folder>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Create a `.env` file:**

    Create a file named `.env` in the root directory of the project and add the following environment variables:

    ```
    GEMINI_API_KEY=${geminiApiKeyPlaceholder}
    ENDPOINT=${endpointPlaceholder}
    PORT=${portPlaceholder} # Or any port you prefer
    ```

    - **`GEMINI_API_KEY`**: Obtain your API key from the [Google AI Studio](https://aistudio.google.com/app/apikey).
    - **`ENDPOINT`**: This should be the base URL for your patch notes, where appending the patch number will fetch the specific patch notes (e.g., `https://example.com/patches/`).
    - **`PORT`**: The port on which the API server will listen.

### Running the Application

To start the development server, run:

```bash
npm start
# or
yarn start
```

The API will be accessible at `http://localhost:PORT`.

---

## API Endpoint

### `GET /patches`

Retrieves a summarized version of the patch notes for a given patch number.

#### Query Parameters

- `patch` (optional): The patch number to retrieve. Defaults to `510` if not provided.

#### Example Request

```bash
curl "http://localhost:${portPlaceholder}/patches?patch=510"
```

#### Example Success Response

```
Patch 510 introduces significant balance adjustments across various game elements. Several items have undergone statistical modifications, impacting their effectiveness in combat and utility. Character abilities have been refined, with specific skills receiving numerical tweaks to damage, cooldowns, or resource costs. Furthermore, the update includes general system optimizations aimed at improving overall game performance and stability.
```

#### Example Error Response

```json
{
  "message": "Patch notes not found for the specified patch."
}
```

Or

```
Failed to fetch or parse HTML
```

---

## Code Overview

### `app.ts` (or `app.js`)

This is the main entry point of the application, setting up the Express server and defining the `/patches` route.

- **`extractPatchNotes(html: string)`**: This function uses `cheerio` to parse the input HTML, remove unwanted elements (like embeds, links, images), convert `<strong>` tags to Markdown bold, and extract `h2`, `h3`, `p`, and `li` tags into a clean Markdown-like string.
- **`/patches` Endpoint**:
  - Fetches the HTML content from the `ENDPOINT` based on the `patch` query parameter.
  - Calls `extractPatchNotes` to clean the raw HTML.
  - Sends the cleaned text to the Google Gemini API (model `gemini-2.0-flash-exp`) with a prompt to summarize the content into a single, clear paragraph, starting with "Patch [patch-id]".
  - Returns the summarized text as the API response.
  - Includes error handling for network issues or parsing failures.

---

## Contributing

Feel free to open issues or submit pull requests if you have suggestions or improvements.

---
