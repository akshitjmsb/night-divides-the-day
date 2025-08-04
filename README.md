# Night Divides the Day - Personal Dashboard

This is a personal dashboard application designed to provide daily reflections, tasks, and learning modules. It's built with HTML, TailwindCSS (via CDN), TypeScript, and the Google Gemini API.

*Last updated: Testing GitHub Actions*

## Project Structure

The project is organized into a clean and maintainable structure.

```
.
├── .gitignore         # Tells Git which files to ignore
├── index.html         # Main HTML file - The application entry point
├── metadata.json      # Application metadata
├── package.json       # Project dependencies and scripts
├── README.md          # This file
└── src/
    ├── index.css      # Custom styles for the application
    └── index.tsx      # Core application logic in TypeScript
```

## Local Development

To run this project on your local machine, you'll need [Node.js](https://nodejs.org/) installed.

### 1. Install Dependencies

Install the local development server. This command reads the `package.json` file and installs the necessary packages (in this case, `serve`).

```bash
npm install
```

### 2. Run the Server

Start the local development server. The `start` script is defined in `package.json`.

```bash
npm start
```

This will start a simple web server, usually at `http://localhost:3000`. You can open this URL in your browser to see the application.

*Note: The application expects the `API_KEY` environment variable to be available in its execution context.*

## Deployment to Hostinger

Hostinger provides static web hosting which is perfect for this project.

1.  **Build Your Project:** This project runs without a build step. Ensure all your latest changes are saved.
2.  **Upload Files:** Using Hostinger's File Manager or an FTP client, upload the following files and directories to your `public_html` directory (or the equivalent root directory for your website):
    *   `index.html`
    *   `metadata.json`
    *   The entire `src/` directory (containing `index.tsx` and `index.css`)
3.  **Configure Environment Variables:** In your Hostinger control panel, you will need to configure the `API_KEY` environment variable so that your Gemini API key is available to the application. The specific steps may vary depending on your hosting plan and whether it supports runtime environment variables for client-side code.
4.  **Visit Your Domain:** Once the files are uploaded and the environment is configured, you can visit your domain name to see the application live.