#!/usr/bin/env node
const chalk = require("chalk");
const clear = require("clear");
const figlet = require("figlet");
const cp = require("child_process");

const files = require("./lib/files");
const inquirer = require("./lib/inquirer");

clear();

console.log(
  chalk.magenta(figlet.textSync("AAPI", { horizontalLayout: "full" }))
);
const cleanup = () => {
  console.log("Cleaning up.");
  // Reset changes made to package.json files.
  cp.execSync(`git checkout -- packages/*/package.json`);
  // Uncomment when snapshot testing is enabled by default:
  // rm ./template/src/__snapshots__/App.test.js.snap
};

const handleExit = () => {
  cleanup();
  console.log("Exiting without error.");
  process.exit();
};

const handleError = (e) => {
  console.error("ERROR! An error was encountered while executing");
  console.error(e);
  cleanup();
  chalk.red("Exiting with error.");
  process.exit(1);
};
let config;
const run = async () => {
  config = await inquirer.askNameApi();
  await files.firstBuild(config)
  //   const credentials = await inquirer.askTypesOfApi();
  //   console.log(credentials);
};

run();
