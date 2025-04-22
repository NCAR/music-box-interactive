# MusicBox Interactive Client

[![GitHub Releases](https://img.shields.io/github/release/NCAR/music-box-interactive-client.svg)](https://github.com/NCAR/music-box-interactive-client/releases)
[![License](https://img.shields.io/github/license/NCAR/music-box-interactive-client.svg)](https://github.com/NCAR/music-box-interactive-client/blob/master/LICENSE)
[![Tests](https://github.com/NCAR/music-box-interactive-client/actions/workflows/test.yml/badge.svg)](https://github.com/NCAR/music-box-interactive-client/actions/workflows/test.yml)

This repository contains the code for both the offline desktop application and the frontend web application.

> [!NOTE]  
> The web app dev server is not able to run simulations. If you want to run simulations and plot results, you have **three** options.
>
> 1. run the desktop application from this repository
> 2. connect to the API server by [cloning and running the api server](https://github.com/NCAR/music-box-interactive-api), or
> 3. change the `.env.development` files value of `VITE_API_URL` to `'https://musicbox.acom.ucar.edu/musicbox'` which will allow you to use the deployed version of the API server.

## Getting Started

### Clone the repo

```bash
git clone https://github.com/ncar/musicbox-interactive-client
```

### Install node

#### macOS

```zsh
brew install node
```

#### Windows

##### Install Node, binary download

Go to [https://nodejs.org/en/download](https://nodejs.org/en/download) and install node and npm

##### Install Node, winget

Open up a developer command prompt

```powershell
winget install -e --id OpenJS.NodeJS
```

Once that installs, close and reopen the command prompt and then move to the directory where `music-box-interactive-client` was cloned to

### Verify node and npm installation

```bash
# verifies node is in the environment
node -v

# verifies npm is in the environment
npm -v
```

### Install dependencies

Ensure you are located in the `musicbox-interactive-client` repo and run

```bash
npm install
```

This will take about 20 seconds.

### Dev Server

The electron desktop application and the web application each have their own dev server.

#### To run the webapp's dev server

```bash
npm run dev
```

#### To run the desktop app's dev server

```bash
npm run e:dev
```

## Testing a production build before deploying

We use feature flags to turn features on and off. You can change the values in the development file, but you can also build the files for production and use all of the values in `.env.production` while pointing to the production version of the API server.

To do so, run

```bash
npm run build
npm run preview
```

Vite will build the files and then serve them as if this were a production build

## Building the desktop application

The desktop application uses electron-forge (electron-packager, Squirrel.Windows) to build and package the app into distributable binaries.

Run the following to both build the application for the current OS/arch and package into .zip files for distribution.

```bash
npm run e:package
```

The outputted binaries should be located in `./out/make/`.
