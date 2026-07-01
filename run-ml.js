const { execSync, spawn } = require("child_process");
const path = require("path");

function getPythonCommand() {
  // Test if python3 is available (common on macOS/Linux)
  try {
    execSync("python3 --version", { stdio: "ignore" });
    return "python3";
  } catch (e) {
    // Fallback to python (common on Windows)
    try {
      execSync("python --version", { stdio: "ignore" });
      return "python";
    } catch (err) {
      console.error("Error: Python is not installed or not in PATH.");
      process.exit(1);
    }
  }
}

const pythonCmd = getPythonCommand();
console.log(`Using Python command: ${pythonCmd}`);

// Use absolute path to the ml directory
const appDir = path.join(__dirname, "ml");

console.log(`Launching FastAPI from directory: ${appDir}`);

// Spawn uvicorn process
const child = spawn(
  pythonCmd,
  ["-m", "uvicorn", "main:app", "--app-dir", appDir, "--port", "8000", "--reload"],
  { stdio: "inherit", shell: true }
);

child.on("close", (code) => {
  process.exit(code);
});
