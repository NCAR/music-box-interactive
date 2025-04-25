import { createTheme } from "@mui/material/styles";
import { light } from "@mui/material/styles/createPalette";
import { lighten } from "@mui/system";

let ucarGreen = "#00797C";
let ncarBlue = "#1A658F";
let deepBlue = "#012169";
let highlightGreen = "#A8C700";
let coolGray = "#53565A";
let backgroundBlue = "#C3D7EE";
let white = "#F5F5F5";

const theme = createTheme({
  palette: {
    primary: {
      main: ucarGreen,
    },
    secondary: {
      main: ncarBlue,
    },
    error: {
      main: highlightGreen,
    },
    background: {
      default: backgroundBlue,
      paper: lighten(backgroundBlue, 0.8),
      white: white,
    },
    text: {
      primary: deepBlue,
      secondary: coolGray,
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
  },
});

export default theme;
