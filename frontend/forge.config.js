import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import fs from "fs";
import path from "path";

export default {
  packagerConfig: {
    asar: true,
    ignore: [
      /^\/src/,
      /(.eslintrc.json)|(.gitignore)|(electron.vite.config.ts)|(forge.config.cjs)|(tsconfig.*)/,
    ],
    extraResource: [
      "./src/scripts/print_config.py",
      "./src/examples/CHAPMAN.json",
      "./src/examples/FLOW_TUBE.json",
      "./src/examples/FULL_GAS_PHASE.json",
      "./python/",
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    prePackage: async () => {
      const pythonBinDir = path.join("python");
      console.log(`${pythonBinDir}`);
      if (fs.existsSync(pythonBinDir)) {
        const files = fs.readdirSync(pythonBinDir);
        for (const file of files) {
          const filePath = path.join(pythonBinDir, file);
          const stats = fs.statSync(filePath);
          if (!stats.isDirectory() && stats.nlink > 1) {
            const realPath = fs.realpathSync(filePath);
            fs.unlinkSync(filePath);
            fs.copyFileSync(realPath, filePath);
          }
        }
      }
    },
  },
};
