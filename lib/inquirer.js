const inquirer = require("inquirer");

module.exports = {
  askNameApi: () => {
    const questions = [
      {
        name: "apiName",
        type: "input",
        message: "Enter your API name :",
        validate: function (value) {
          if (value.length) {
            return true;
          } else {
            return "Please enter your API name.";
          }
        },
      },
    ];
    return inquirer.prompt(questions);
  },
  askTypesOfApi: (filelist) => {
    const questions = [
      {
        type: "list",
        name: "dbType",
        message: "Select your DB type:",
        choices: ["mysql", "mongodb", "postgresql"],
        default: ["mysql"],
      },
    ];
    return inquirer.prompt(questions);
  },
};
