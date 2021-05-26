var inquirer = require('inquirer');
const { validator, required, filename } = require('../validator')
inquirer.registerPrompt("table", require('../index.js'))

inquirer
  .prompt([
    {
      type: 'table',
      name: 'process',
      message: '请输入步骤配置信息',
      columns: [1,2,3,4],
      rows: [
        {
          name: 'name',
          validate: validator(required, filename)
        },
        {
          name: 'title'
        },
        {
          name: 'exit',
          type: Boolean,
          default: true
        },
        {
          name: 'submit',
          type: Boolean,
          default: true
        },
        {
          name: 'preview',
          type: Boolean,
          default: true
        },
        {
          name: 'next',
          type: Boolean,
          default: true
        },
        {
          name: 'disabled',
          type: Boolean,
          default: false
        }
      ]
    }
  ])
  .then((answers) => {
    console.info(answers)
  })
  .catch((error) => {
    if (error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
    } else {
      // Something else went wrong
    }
  });