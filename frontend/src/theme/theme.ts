import { createTheme } from "@mui/material/styles"

const theme = createTheme({
    palette:{
        primary:{
            main: "#da291c",
            contrastText:"#fff"
        },
        secondary:{
            main: "#3d3925",
            contrastText:"#fff"
        },
        background:{
        default:"#fff"
        },
        text:{
            primary: "#3d3925",
            secondary:"#da291c"
        },
    },
});

export default theme