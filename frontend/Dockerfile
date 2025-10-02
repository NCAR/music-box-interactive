# Use Node.js base image
FROM node:24-bullseye AS base

# Install Vite globally
RUN npm install -g vite

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

# Start Vite dev server and listen on all network interfaces
CMD ["vite", "--host"]
