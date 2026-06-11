# Use Node.js base image
FROM node:24-bullseye AS base

# Copy project files into the container
COPY . MusicBoxInteractiveFrontend/

# Set working directory
WORKDIR /MusicBoxInteractiveFrontend

# Clean host-specific folders that may cause issues
RUN rm -rf node_modules package-lock.json

# Install dependencies
RUN npm install

# Build the project
RUN npm run build

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server (project-local pinned vite) and listen on all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
