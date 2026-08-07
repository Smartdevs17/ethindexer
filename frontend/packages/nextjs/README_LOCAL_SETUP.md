# Running Frontend Locally

## Quick Start

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend/packages/nextjs
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   yarn install
   ```

3. **Set up environment variables (optional):**
   
   Create a `.env.local` file in `frontend/packages/nextjs/` if your backend is not running on `http://localhost:3001`:
   
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
   NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
   ```
   
   **Note:** If your backend is on `localhost:3001`, you can skip this step as these are the defaults.

4. **Start the development server:**
   ```bash
   yarn dev
   ```
   
   Or:
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   The frontend will be available at: `http://localhost:3000`

## Prerequisites

- **Backend must be running** on `http://localhost:3001` (or update the env vars)
- Node.js v18 or higher
- Yarn package manager (or npm)

## Troubleshooting

### Port already in use
If port 3000 is already in use, Next.js will automatically use the next available port (3001, 3002, etc.)

### Backend connection issues
- Make sure your backend is running: `cd backend && npm run dev`
- Check that the backend URL in `.env.local` matches your backend port
- Check browser console for connection errors

### Dependencies issues
If you encounter dependency errors:
```bash
rm -rf node_modules yarn.lock
yarn install
```

## Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn format` - Format code with Prettier

