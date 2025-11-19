FastAnswers ✏️

FastAnswers is a minimalist, privacy-focused search engine designed with a unique hand-drawn aesthetic. It provides ultra-concise answers (under 15 words) without using AI models, relying instead on smart parsing of open-source data.

The project runs entirely in the browser with zero server costs, zero cloud database dependencies, and zero AI API fees.

✨ Features

Zero-AI Summaries: Fetches data from Wikipedia and intelligently truncates it to provide "human-like" short answers (e.g., "Hi is a form of a welcoming greeting.").

Sketch UI: A custom, hand-drawn interface styling using Tailwind CSS.

Multi-Format Search:

Text: Strict 15-word limit summaries.

Images: Fetches relevant thumbnails from Wikipedia articles.

Videos: Searches Wikimedia Commons for educational video files.

Detailed: Provides the full introduction paragraph when you need more context.

Media Popup: Integrated media viewer with mandatory copyright/source warnings.

Recent Searches: Persists search history locally in your browser (using localStorage)—no data leaves your device.

Smart Fallbacks: Automatically cleans up queries (removing filler words) to find better matches.

404 Page: A custom "Missing" page matching the sketch aesthetic.

🛠️ Tech Stack

Frontend: HTML5, Vanilla JavaScript

Styling: Tailwind CSS (via CDN)

Data Source: Wikipedia API & Wikimedia Commons API

Storage: Browser localStorage (No database required)

🚀 How to Run

Since this is a static, client-side application, no build step or server is required.

Download the index.html and 404.html files.

Open index.html directly in any modern web browser (Chrome, Firefox, Edge, Safari).

Start searching!

🧩 API Usage

This project uses the public MediaWiki Action API. It is free to use and requires no API key for standard usage.

Text & Details: en.wikipedia.org/w/api.php

Simple English Fallback: simple.wikipedia.org/w/api.php

Images & Videos: Fetched via pageimages and imageinfo props from Wikipedia/Wikimedia.

⚠️ Note on Media

This application displays images and videos sourced from Wikipedia.

Always check the Source link provided in the popup.

Verify copyright and licensing (Creative Commons, Public Domain, etc.) before using any media found through this tool.

📄 License

This project is open-source and free to use.
