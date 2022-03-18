const Base = require("inquirer/lib/prompts/base")
const observe = require("inquirer/lib/utils/events")
const { map, takeUntil } = require("rxjs/operators")
const cliCursor = require("cli-cursor")
const chalk = require("chalk")
const { table } = require("table")
const figures = require("figures")

const normalizeString = (input) => {
  return input.replace(/\r\n/g, '\n');
};

class InquirerTableInsertPrompt extends Base {
  constructor(questions, rl, answers) {
    super(questions, rl, answers);
    this.columns = this.initColumn(answers)
    this.rows = this.opt.rows
    this.values = this.initValue(this.rows)
    this.pointer = 0;
    this.horizontalPointer = 0;
  }

  // 支持字符串、{name: '', value: ''}
  initColumn (answers) {
    let res = []
    if (Array.isArray(this.opt.columns)) {
      res = this.opt.columns
    } else if (typeof this.opt.columns === 'function') {
      res = this.opt.columns(answers)
    }
    return res.map(v => {
      if (typeof v === 'string' || typeof v === 'number') {
        return { name: v, value: v}
      }
      return v
    })
  }

  initValue (rows) {
    return rows.map(v => {
      const type = v.type

      if (type) {
        if (type.name === 'Boolean') {
          return this.columns.map(m => {
            return typeof v.default !== 'undefined' ? v.default : false
          })
        }
        
        if (type.name === 'Select') {
          return this.columns.map(m => {
            const index = v.type.options.findIndex(m => m === v.default)
            return typeof v.default !== 'undefined' ? Math.min(0, index)  : 0
          })
        }

        return this.columns.map(m => {
          return typeof v.default !== 'undefined' ? v.default : new type()
        })
      }

      return this.columns.map(m => [])
    })
  }

  _run(callback) {
    this.done = callback;

    const events = observe(this.rl);
    const validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));
    
    events.keypress.forEach(({ key, value }) => {
      switch (key.name) {
        case "left":
          return this.onLeftKey();

        case "right":
          return this.onRightKey();
        default:
      }

      if (!this.rows[this.pointer].type) {
        switch (key.name) {
          case "backspace":
              this.values[this.pointer][this.horizontalPointer].pop()
              this.render()
            return
            case 'delete':
              this.values[this.pointer][this.horizontalPointer].shift()
              this.render()
            return
          default:
            // 禁止输入控制字符
            if (!/[\u0001-\u0006\u0008\u0009\u000B-\u001A]/.test(normalizeString(String(value)))) {
              this.values[this.pointer][this.horizontalPointer].push(value)
              this.render()
            }
        }
      }
    });

    events.normalizedUpKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));
    events.normalizedDownKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));
    events.spaceKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onSpaceKey.bind(this));

    if (this.rl.line) {
      this.onKeypress();
    }

    cliCursor.hide();
    this.render();

    return this;
  }

  onLeftKey() {
    const length = this.columns.length;

    this.horizontalPointer =
      this.horizontalPointer > 0 ? this.horizontalPointer - 1 : length - 1;
    this.render();
  }

  onRightKey() {
    const length = this.columns.length;

    this.horizontalPointer =
      this.horizontalPointer < length - 1 ? this.horizontalPointer + 1 : 0;
    this.render();
  }

  onDownKey() {
    const length = this.rows.length;

    this.pointer = this.pointer < length - 1 ? this.pointer + 1 : this.pointer;
    this.render();
  }

  onUpKey() {
    this.pointer = this.pointer > 0 ? this.pointer - 1 : this.pointer;
    this.render();
  }

  onSpaceKey () {
    const curr = this.values[this.pointer][this.horizontalPointer]
    const type = this.rows[this.pointer].type
    if (type && type.name === 'Boolean') {
      this.values[this.pointer][this.horizontalPointer] = !curr
      this.render();
    }

    if (type && type.name === 'Select') {
      this.values[this.pointer][this.horizontalPointer] = (curr + 1) % type.options.length;
      this.render();
    }
  }

  getCurrentValue () {
    // 拼接参数
    const res = []
    this.columns.forEach((v, i) => {
      const row = {}
      this.rows.forEach((m, k) => {
        row[m.name] = this.rows[k].type ? this.values[k][i] : this.values[k][i].join('')
      })
      res.push(row)
    })
    return res
  }

  onEnd(state) {
    this.status = "answered";
    this.spaceKeyPressed = true;

    this.render();

    this.screen.done();
    cliCursor.show();
    this.done(state.value);
  }

  onError(state) {
    this.render(state.isValid);
  }

  render(error) {
    let bottomContent = "";
    const message = [this.getQuestion()];

    const thead = ['attributes/steps'].concat(this.columns.map(v => v.name))

    const values = [ thead ]
    const errorSet = new Set()
    this.rows.forEach((row, rowIndex) => {
      const columnValues = [chalk.reset(row.name)];

      this.columns.forEach((column, columnIndex) => {
        const isSelected =
          this.status !== "answered" &&
          this.pointer === rowIndex &&
          this.horizontalPointer === columnIndex;
        const value = this.rows[rowIndex].type ? this.values[rowIndex][columnIndex] : this.values[rowIndex][columnIndex].join('')
        if (row.type && row.type.name === 'Boolean') {
          const display = value ? figures.radioOn : figures.radioOff
          columnValues.push(`${isSelected ? "[" : " "} ${display} ${isSelected ? "]" : " "}`)
        } else if (row.type && row.type.name === 'Select') {
          const display = row.type.options[value]
          columnValues.push(isSelected ? `[${display}]` : `${display}`);
        } else {
          columnValues.push(isSelected ? `[${value}]` : `${value}`);
        }

        if (row.validate && isSelected) {
          if (typeof row.validate(value) === 'string') {
            errorSet.add(row.validate(value))
          }
        }
      });

      values.push(columnValues)
    });

    const instruction = chalk.gray([
      '方向键 ← ↑ ↓ → 控制光标 [] 移动',
      'del backspace 键支持从前后两个方向删除',
      'space 键可用于控制选中与否',
    ].map((v, i) => `${i + 1}. ${v}`).join('\n'))

    const tableString = table(values).toString()

    message.push(instruction, tableString)
    
    if (errorSet.size > 0) {
      error = error || '' + Array.from(errorSet).join('\n')
    }

    if (error) {
      bottomContent = chalk.red(">> ") + error;
    }

    this.screen.render(message.join('\n\n'),  bottomContent);
  }
}

module.exports = InquirerTableInsertPrompt

module.exports.Select = require('./types/select.js')