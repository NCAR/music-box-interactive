# Use Node.js base image
FROM node:24-bookworm AS base

# Set working directory
WORKDIR /MusicBoxInteractiveFrontend

# Install dependencies from the lockfile
COPY package*.json ./
RUN npm ci

# Copy project files into the container
COPY . .

# Build the project
RUN npm run build

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server (project-local pinned vite) and listen on all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
