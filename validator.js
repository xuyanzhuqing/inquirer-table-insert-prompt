exports.validator = function (...methods) {
  const me = this
  return function (input) {
    return methods.reduce((acc, curr) => {
      const currRes = curr.call(me, input)
      return typeof acc === 'string' ? acc : currRes 
    }, true)
  }
}

exports.required = function (input) {
  const tip = '参数不能为空'
  if (typeof input === 'undefined' || input === null || input === '') {
    return tip
  }

  if (Array.isArray(input)) {
    return input.length > 0 || tip
  }

  if (typeof input === 'object') {
    return Object.keys(input).length > 0 || tip
  }
  return true
}

exports.isNumber = function (input) {
  return typeof input === 'number' || '必须是数字类型'
}

exports.isInt = function (input) {
  return /^[0-9]+$/g.test(input) || '请输入正整数'
}

exports.filename = function (input) {
  return /^[a-z]+-{0,}[a-z0-9]{0,}$/.test(input) || '仅允许数字字母中横线，数字不能开头'
}

exports.IntRange = function ({ min, max }) {
  return function (input) {
    const isInt =  /^[0-9]+$/g.test(input)
    if (!isInt) {
      return '请输入正整数'
    }

    const realInput = parseInt(input)
    if (min && realInput < min) {
      return '必须大于最小数字的数字' + min
    }

    if (max && max < realInput) {
      return '请输入小于最大数字的数字' + max
    }

    return true
  }
}
