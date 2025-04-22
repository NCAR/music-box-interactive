import axios from "axios";
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "X-CSRFToken";

import isElectron from "is-electron";

const apiUrl = import.meta.env.VITE_API_URL;

async function fetchConfiguration(file) {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await axios.post(`${apiUrl}/api/extract-config`, formData);
    return response.data;
  } catch (error) {
    console.error(`Error loading compressed configuration: ${error.message}`);
    throw error;
  }
}

async function fetchCompressedConfiguration(config) {
  try {
    const response = await axios.post(
      `${apiUrl}/api/compress-config`,
      { config: config },
      { responseType: "arraybuffer" },
    );
    const blob = new Blob([response.data], {
      type: response.headers.get("content-type"),
    });
    return window.URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Error fetching compressed configuration: ${error.message}`);
    throw error;
  }
}

async function fetchResults() {
  try {
    const response = await axios.get(`${apiUrl}/api/download-results`, {
      params: {},
      responseType: "arraybuffer",
    });
    const contentType = response.headers["content-type"];
    let blob;
    let fileExtension;
    if (contentType.includes("application/zip")) {
      blob = new Blob([response.data], { type: "application/zip" });
      fileExtension = "zip";
    } else if (contentType.includes("text/csv")) {
      blob = new Blob([response.data], { type: "text/csv" });
      fileExtension = "csv";
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const url = window.URL.createObjectURL(blob);
    return { url, fileExtension };
  } catch (error) {
    console.error(`Error fetching results:`, error);
    throw error;
  }
}

async function fetchExample(example) {
  if (isElectron()) {
    return await window.electron.loadExample(example);
  }
  try {
    const params = {
      example: example,
    };
    const response = await axios.get(`${apiUrl}/api/load-example`, {
      params: params,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching example ${example}: ${error.message}`);
    throw error;
  }
}

async function run(config) {
  try {
    await axios.post(`${apiUrl}/api/run`, { config: config });
  } catch (error) {
    console.error(`Error calling run: ${error.message}`);
    throw error;
  }
}

async function fetchFlowDiagram(data) {
  try {
    const response = await axios.post(`${apiUrl}/plots/get_flow/`, { ...data });
    return response;
  } catch (error) {
    console.error(`Error calling run: ${error.message}`);
    throw error;
  }
}

async function checkRunStatus() {
  try {
    const response = await axios.get(`${apiUrl}/api/run-status`);
    return response;
  } catch (error) {
    console.error(`Error checking run status: ${error.message}`);
    throw error;
  }
}

async function loadResults() {
  try {
    const response = await axios.get(`${apiUrl}/api/load-results`);
    return response;
  } catch (error) {
    console.error(`Error checking run status: ${error.message}`);
    throw error;
  }
}

export {
  fetchConfiguration,
  fetchCompressedConfiguration,
  fetchResults,
  checkRunStatus,
  fetchExample,
  fetchFlowDiagram,
  run,
  loadResults,
};
