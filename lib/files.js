const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const chalk = require("chalk");
const clear = require("clear");
const figlet = require("figlet");

const files_default = [
  ".gitignore",
  ".nycrc",
  ".travis.yml",
  "LICENSE",
  "README.md",
  "config",
  "logger.js",
  "node_modules",
  "package-lock.json",
  "package.json",
  "routes.js",
  "server.js",
  "src",
];

const arraysMatch = function (arr1, arr2) {
  // Check if the arrays are the same length
  if (arr1.length !== arr2.length) return false;

  // Check if all items exist and are in the same order
  for (var i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }

  // Otherwise, return true
  return true;
};
module.exports = {
  getCurrentDirectoryBase: () => {
    return path.basename(process.cwd());
  },

  directoryExists: (filePath) => {
    return fs.existsSync(filePath);
  },

  firstBuild: (conf) => {
    fs.mkdir(conf.apiName, (e) => {
      if (!e || (e && e.code === "EEXIST")) {
        exec(`cp -R ${__dirname}/template/. ${conf.apiName}/`, (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
            return;
          }
          exec(
            `node -e "let pkg=require('${__dirname}/template/package.json'); pkg.name='${conf.apiName}'; require('fs').writeFileSync('${conf.apiName}/package.json', JSON.stringify(pkg, null, 2));"`,
            (error, stdout, stderr) => {
              if (error) {
                console.log(`error: ${error.message}`);
                return;
              }
              exec(
                `(cd ${conf.apiName} && npm install -f)`,
                (error, stdout, stderr) => {
                  if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                  }
                  fs.readdir(conf.apiName, (err, files) => {
                    if (err) console.log(err);
                    else {
                      console.log("\nCurrent directory filenames:");
                      if (arraysMatch(files, files_default)) {
                        clear();
                        console.log(
                          chalk.magenta(figlet.textSync("AAPI", { horizontalLayout: "full" }))
                        );
                        console.group(
                          chalk.green(
                            "Your API " +
                              chalk.blue.underline.bold(conf.apiName) +
                              " twas created ! \n \n \n "
                          )
                        );
                        console.log(chalk.green('Just do : \n'))
                        console.log(chalk.red(`$ cd ${conf.apiName}`))
                        console.log(chalk.red(`$ npm start \n \n`))
                        console.log(chalk.magenta('Have fun !! \n'))
                        console.groupEnd()
                      }
                    }
                  });
                }
              );
            }
          );
        });
      } else {
        //debug
        console.log(e);
      }
    });
  },
  checkInstall: (conf) => {},
};
