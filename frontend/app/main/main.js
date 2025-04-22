import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import util from "util";

let mainWindow;
let appDataPath;

let recentConfig;
let recentResults;

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "../../preload/preload.js"),
      contextIsolation: true,
    },
  });

  // Vite dev server URL
  // Determine the correct URL based on the environment
  const isDev = process.env.NODE_ENV === "development";
  const url = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../renderer/index.html")}`;

  mainWindow.loadURL(url);
  mainWindow.on("closed", () => (mainWindow = null));
}

console.log("running app");

app.whenReady().then(() => {
  appDataPath = app.getPath("userData");

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow == null) {
    createWindow();
  }
});

// Convert fs.writeFile into a Promise-based function
const writeFile = util.promisify(fs.writeFile);

ipcMain.handle("run-python", async (event, script, args) => {
  // Generate a unique file name in the temp directory
  const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.json`);

  // Write the data to the temp file
  await writeFile(tempFilePath, JSON.stringify(args, null, 4));

  recentConfig = args;

  // Determine script file path
  let scriptPath = path.join(process.resourcesPath, script);
  if (fs.existsSync(scriptPath)) {
  } else {
    scriptPath = path.resolve(
      app.getAppPath(),
      "src",
      "scripts",
      "print_config.py",
    );
  }

  function findPython() {
    const possibilities = [
      // In packaged app
      path.join(process.resourcesPath, "python", "bin", "python"),
      path.join(process.resourcesPath, "python", "python.exe"),
      // In development
      path.join(__dirname, "python", "bin", "python"),
      path.join(__dirname, "python", "python.exe"),
    ];
    for (const path of possibilities) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    console.log("Could not find python3, checked", possibilities);
    app.quit();
  }

  // for dev, use python from system path
  const pythonPath = app.isPackaged ? findPython() : "python";

  const command = `${pythonPath} ${scriptPath} ${tempFilePath}`;
  console.log(`Full command: ${command}`);

  try {
    return new Promise((resolve, reject) => {
      const python = spawn(pythonPath, [scriptPath, tempFilePath]);

      let output = "";
      python.stdout.on("data", (data) => {
        output += data;
      });

      python.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`child process exited with code ${code}`));
        } else {
          recentResults = output;

          // Parse the output into a 2D array
          const outputArray = JSON.parse(output);
          // Get the headers from the first row
          const headers = outputArray[0];
          // Get the rows from the rest of the array
          const rows = outputArray.slice(1);
          // Initialize the output object
          const outputObject = {};
          // Initialize an array for each header in the output object
          headers.forEach((header) => {
            outputObject[header] = [];
          });
          // Add the values to the corresponding arrays in the output object
          rows.forEach((row) => {
            headers.forEach((header, i) => {
              outputObject[header].push(row[i]);
            });
          });
          resolve(outputObject);
        }
      });
    });
  } catch (error) {
    console.error(`Error running python script: ${error.message}`);
  }
});

ipcMain.handle("load-example", async (event, example) => {
  const exampleFile = `${example}.json`;
  let examplePath = path.join(process.resourcesPath, exampleFile);
  if (fs.existsSync(examplePath)) {
  } else {
    examplePath = path.resolve(
      app.getAppPath(),
      "src",
      "examples",
      exampleFile,
    );
  }

  console.log(`Full path: ${examplePath}`);

  let jsonData = "";
  try {
    return new Promise((resolve, reject) => {
      fs.readFile(examplePath, "utf8", (err, data) => {
        if (err) {
          console.error(`Error reading file: ${err}`);
          return;
        }

        // Parse the JSON data into a JavaScript object
        jsonData = JSON.parse(data);

        // Now you can use the jsonData variable which holds the contents of the JSON file
        resolve(jsonData);
      });
    });
  } catch (error) {
    console.error(`Error getting example: ${error.message}`);
  }
  return;
});

ipcMain.handle("save-results", async (event, name) => {
  // Generate a unique file name in the OS's default data directory
  const mechanismString =
    name && name.trim() !== "" ? name : `mechanism-${Date.now()}`;

  const configFileDir = path.join(
    appDataPath,
    "previous_results",
    mechanismString,
  );

  await fs.promises.mkdir(configFileDir, { recursive: true });

  const configFilePath = path.join(configFileDir, `config-${Date.now()}.json`);

  await writeFile(configFilePath, JSON.stringify(recentConfig, null, 4));

  const resultsFilePath = path.join(
    configFileDir,
    `results-${Date.now()}.json`,
  );

  await writeFile(resultsFilePath, recentResults);
});

ipcMain.handle("get-prev-results", async (event) => {
  const directories = fs
    .readdirSync(path.resolve(appDataPath, "previous_results"), {
      withFileTypes: true,
    })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  return directories;
});

function setReactionIds(config) {
  let reactions = config["mechanism"]["reactions"]["camp-data"][0]["reactions"];
  let reactionIds = reactions.map((reaction, index) => {
    // Look for keys that start with "irr_"
    for (let key in reaction["products"]) {
      if (key.startsWith("irr_")) {
        // Set the id as the substring of the key starting after the 5th character
        reaction["id"] = key.substring(5);
        // Delete the key
        delete reaction["products"][key];
        break;
      }
    }
    return reaction;
  });
  config["mechanism"]["reactions"]["camp-data"][0]["reactions"] = reactionIds;
}
//loads config from uploaded filed
ipcMain.handle("load-config", async (event, path) => {
  return new Promise((resolve, reject) => {
    // Load the configuration from the file
    try {
      const configFileContent = fs.readFileSync(path, "utf8");

      let config = JSON.parse(configFileContent);

      recentConfig = JSON.parse(configFileContent);

      // Get the 'camp-data' array
      let campData = config["mechanism"]["species"]["camp-data"];
      // Filter out the dictionaries where the 'name' key starts with 'irr'
      campData = campData.filter((dict) => !dict.name.startsWith("irr_"));

      // Update the 'camp-data' array in the config object
      config["mechanism"]["species"]["camp-data"] = campData;

      setReactionIds(config);

      // Fix evolving conditions
      let evolvingConditions = config["conditions"]["evolving conditions"];
      let headers = evolvingConditions[0];

      let newConditions = {};

      headers.forEach((header, index) => {
        if (header.startsWith("time")) {
          header = "time";
        }

        newConditions[header] = {};

        for (let i = 0; i < evolvingConditions.length - 1; ++i) {
          newConditions[header][`${i}`] = evolvingConditions[i + 1][index];
        }
      });

      config["conditions"]["evolving conditions"] = newConditions;

      resolve(config);
    } catch (error) {
      console.error(`Error loading config: ${error.message}`);
    }
  });
});

ipcMain.handle("load-previous-config", async (event, dir) => {
  return new Promise((resolve, reject) => {
    let filePath = path.resolve(appDataPath, "previous_results", dir);
    if (fs.existsSync(filePath)) {
      const files = fs.readdirSync(filePath);

      const configFile = files.find((file) => file.startsWith("config"));

      // Load the configuration from the file
      try {
        const configFileContent = fs.readFileSync(
          path.join(filePath, configFile),
          "utf-8",
        );
        let config = JSON.parse(configFileContent);
        recentConfig = JSON.parse(configFileContent);

        // Get the 'camp-data' array
        let campData = config["mechanism"]["species"]["camp-data"];

        // Filter out the dictionaries where the 'name' key starts with 'irr'
        campData = campData.filter((dict) => !dict.name.startsWith("irr_"));

        // Update the 'camp-data' array in the config object
        config["mechanism"]["species"]["camp-data"] = campData;

        setReactionIds(config);

        // Fix evolving conditions
        let evolvingConditions = config["conditions"]["evolving conditions"];
        let headers = evolvingConditions[0];

        let newConditions = {};

        headers.forEach((header, index) => {
          if (header.startsWith("time")) {
            header = "time";
          }

          newConditions[header] = {};

          for (let i = 0; i < evolvingConditions.length - 1; ++i) {
            newConditions[header][`${i}`] = evolvingConditions[i + 1][index];
          }
        });

        config["conditions"]["evolving conditions"] = newConditions;

        resolve(config);
      } catch (error) {
        console.error(`Error loading config: ${error.message}`);
      }
    } else {
      reject(`File not found: ${filePath}`);
    }
  });
});

ipcMain.handle("load-previous-results", async (event, dir) => {
  return new Promise((resolve, reject) => {
    let filePath = path.resolve(appDataPath, "previous_results", dir);
    if (fs.existsSync(filePath)) {
      const files = fs.readdirSync(filePath);

      const resultsFile = files.find((file) => file.startsWith("results"));

      try {
        const data = fs.readFileSync(path.join(filePath, resultsFile), "utf8");
        const jsonData = JSON.parse(data);
        recentResults = data;
        // Get the headers from the first row
        const headers = jsonData[0];
        // Get the rows from the rest of the array
        const rows = jsonData.slice(1);
        // Initialize the output object
        const outputObject = {};
        // Initialize an array for each header in the output object
        headers.forEach((header) => {
          outputObject[header] = [];
        });
        // Add the values to the corresponding arrays in the output object
        rows.forEach((row) => {
          headers.forEach((header, i) => {
            outputObject[header].push(row[i]);
          });
        });
        resolve(outputObject);
      } catch (error) {
        reject(`Error reading file: ${error.message}`);
      }
    } else {
      reject(`File not found: ${filePath}`);
    }
  });
});

ipcMain.handle("get-recent-results", async (event) => {
  return recentResults;
});

ipcMain.handle("get-recent-config", async (event) => {
  return recentConfig;
});

ipcMain.handle("get-download-path", async (event, defaultPath) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: defaultPath,
  });
  return filePath;
});

ipcMain.handle("get-upload-path", async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
  });

  // This will return the first selected file path
  return filePaths[0];
});

ipcMain.handle("download-file", async (event, filePath, csvData) => {
  // Write the CSV data to the selected file
  await writeFile(filePath, csvData);
  return;
});
