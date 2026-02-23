export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#333333",
        accent: "#ffe600",
        white: "#ffffff",
        grayLight: "#cccccc",
        grayMid: "#999999",
      },
    },
  },
  plugins: [],
};
