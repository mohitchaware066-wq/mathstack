/**
 * MathStack — Mathematical Expression Calculator
 * DSA Project: Stack-based Infix → Postfix → Evaluation
 *
 * NO eval() is used. All computation is performed via Stack algorithms.
 */

/* ============================================================
   STACK IMPLEMENTATION
   Classic array-based Stack ADT with all required operations.
   ============================================================ */
class Stack {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
  }

  pop() {
    if (this.isEmpty()) {
      throw new Error('Stack underflow');
    }
    return this.items.pop();
  }

  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  /** Returns a shallow copy for visualization (bottom → top) */
  toArray() {
    return [...this.items];
  }

  clear() {
    this.items = [];
  }
}

/* ============================================================
   OPERATOR METADATA
   Precedence & associativity used by Shunting-Yard.
   ============================================================ */
const OPERATORS = {
  '+': { precedence: 1, assoc: 'left' },
  '-': { precedence: 1, assoc: 'left' },
  '*': { precedence: 2, assoc: 'left' },
  '/': { precedence: 2, assoc: 'left' },
  '%': { precedence: 2, assoc: 'left' },
  '^': { precedence: 3, assoc: 'right' },
};

function isOperator(token) {
  return Object.prototype.hasOwnProperty.call(OPERATORS, token);
}

function isNumber(token) {
  return /^-?\d+(\.\d+)?$/.test(token);
}

/* ============================================================
   TOKENIZER
   Splits an infix string into tokens while handling:
   - multi-digit numbers & decimals
   - unary minus (e.g. -5, 3 * -2)
   - whitespace
   ============================================================ */
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const s = expr.trim();

  while (i < s.length) {
    // Skip whitespace
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }

    // Number (possibly with leading decimal point or unary minus)
    if (/\d/.test(s[i]) || (s[i] === '.' && i + 1 < s.length && /\d/.test(s[i + 1]))) {
      let num = '';
      while (i < s.length && (/\d/.test(s[i]) || s[i] === '.')) {
        num += s[i];
        i++;
      }
      if ((num.match(/\./g) || []).length > 1) {
        throw new Error(`Invalid number: ${num}`);
      }
      tokens.push(num);
      continue;
    }

    // Unary minus / plus
    // Appears at start, or after another operator, or after '('
    if (
      (s[i] === '-' || s[i] === '+') &&
      (tokens.length === 0 ||
        isOperator(tokens[tokens.length - 1]) ||
        tokens[tokens.length - 1] === '(')
    ) {
      // Look ahead for a number
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (j < s.length && (/\d/.test(s[j]) || s[j] === '.')) {
        let num = s[i]; // keep the sign
        i = j;
        while (i < s.length && (/\d/.test(s[i]) || s[i] === '.')) {
          num += s[i];
          i++;
        }
        if ((num.replace(/^[+-]/, '').match(/\./g) || []).length > 1) {
          throw new Error(`Invalid number: ${num}`);
        }
        tokens.push(num);
        continue;
      }
      // Otherwise treat as binary operator (fall through)
    }

    // Parentheses or operators
    if (s[i] === '(' || s[i] === ')' || isOperator(s[i])) {
      tokens.push(s[i]);
      i++;
      continue;
    }

    throw new Error(`Unexpected character: '${s[i]}' at position ${i + 1}`);
  }

  if (tokens.length === 0) {
    throw new Error('Empty expression');
  }

  return tokens;
}

/* ============================================================
   INFIX → POSTFIX  (Shunting-Yard Algorithm)
   Returns { postfix: string[], steps: object[] }
   Each step records token, action, stack snapshot, output snapshot.
   ============================================================ */
function infixToPostfix(tokens) {
  const output = [];
  const opStack = new Stack();
  const steps = [];

  const record = (token, action) => {
    steps.push({
      token,
      action,
      stack: opStack.toArray().join(' ') || '∅',
      output: output.join(' ') || '∅',
    });
  };

  for (const token of tokens) {
    if (isNumber(token)) {
      output.push(token);
      record(token, 'Operand → append to output');
    } else if (token === '(') {
      opStack.push(token);
      record(token, 'Push "(" onto operator stack');
    } else if (token === ')') {
      while (!opStack.isEmpty() && opStack.peek() !== '(') {
        output.push(opStack.pop());
      }
      if (opStack.isEmpty()) {
        throw new Error('Mismatched parentheses: extra ")"');
      }
      opStack.pop(); // discard '('
      record(token, 'Pop operators until "("; discard "("');
    } else if (isOperator(token)) {
      const curr = OPERATORS[token];
      while (!opStack.isEmpty() && isOperator(opStack.peek())) {
        const top = OPERATORS[opStack.peek()];
        const shouldPop =
          top.precedence > curr.precedence ||
          (top.precedence === curr.precedence && curr.assoc === 'left');
        if (!shouldPop) break;
        output.push(opStack.pop());
      }
      opStack.push(token);
      record(token, `Operator → push after precedence check`);
    }
  }

  // Drain remaining operators
  while (!opStack.isEmpty()) {
    const top = opStack.pop();
    if (top === '(') {
      throw new Error('Mismatched parentheses: extra "("');
    }
    output.push(top);
  }
  if (steps.length > 0 || output.length > 0) {
    record('EOF', 'Pop all remaining operators to output');
  }

  return { postfix: output, steps, finalStack: opStack };
}

/* ============================================================
   POSTFIX EVALUATION
   Returns { result: number, steps: object[] }
   ============================================================ */
function evaluatePostfix(postfix) {
  const evalStack = new Stack();
  const steps = [];

  const record = (token, action) => {
    steps.push({
      token,
      action,
      stack: evalStack.toArray().join(' ') || '∅',
    });
  };

  for (const token of postfix) {
    if (isNumber(token)) {
      evalStack.push(parseFloat(token));
      record(token, 'Operand → push onto evaluation stack');
    } else if (isOperator(token)) {
      if (evalStack.size() < 2) {
        throw new Error(`Insufficient operands for operator "${token}"`);
      }
      const b = evalStack.pop(); // second operand
      const a = evalStack.pop(); // first operand
      let result;

      switch (token) {
        case '+':
          result = a + b;
          break;
        case '-':
          result = a - b;
          break;
        case '*':
          result = a * b;
          break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          result = a / b;
          break;
        case '%':
          if (b === 0) throw new Error('Modulo by zero');
          result = a % b;
          break;
        case '^':
          result = Math.pow(a, b);
          break;
        default:
          throw new Error(`Unknown operator: ${token}`);
      }

      // Clean floating-point noise for display (keep reasonable precision)
      if (Number.isFinite(result)) {
        result = parseFloat(result.toPrecision(12));
      }

      evalStack.push(result);
      record(token, `Compute ${a} ${token} ${b} = ${result} → push`);
    }
  }

  if (evalStack.size() !== 1) {
    throw new Error('Invalid expression: leftover values on stack');
  }

  return { result: evalStack.peek(), steps, finalStack: evalStack };
}

/* ============================================================
   UI HELPERS
   ============================================================ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showError(msg) {
  const box = $('#errorBox');
  box.textContent = msg;
  box.classList.remove('hidden');
  $('#results').classList.add('hidden');
  $('#vizContainer').classList.add('hidden');
  $('#vizPlaceholder').classList.remove('hidden');
}

function clearError() {
  $('#errorBox').classList.add('hidden');
}

function renderConversionTable(steps) {
  const tbody = $('#conversionBody');
  tbody.innerHTML = '';
  steps.forEach((step, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="token-cell">${escapeHtml(step.token)}</td>
      <td class="action-cell">${escapeHtml(step.action)}</td>
      <td class="stack-cell">${escapeHtml(step.stack)}</td>
      <td class="output-cell">${escapeHtml(step.output)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderEvalTable(steps) {
  const tbody = $('#evalBody');
  tbody.innerHTML = '';
  steps.forEach((step, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="token-cell">${escapeHtml(step.token)}</td>
      <td class="action-cell">${escapeHtml(step.action)}</td>
      <td class="stack-cell">${escapeHtml(step.stack)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStackViz(containerId, stackArr) {
  const el = $(containerId);
  el.innerHTML = '';
  if (!stackArr || stackArr.length === 0) {
    el.innerHTML = '<span class="stack-empty">empty</span>';
    return;
  }
  // Display bottom → top (column-reverse CSS handles visual order)
  stackArr.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'stack-item';
    div.textContent = item;
    el.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   MAIN CALCULATE FLOW
   ============================================================ */
function calculate() {
  const input = $('#expression').value.trim();
  clearError();

  if (!input) {
    showError('Please enter a mathematical expression.');
    return;
  }

  try {
    // 1. Tokenize
    const tokens = tokenize(input);

    // 2. Infix → Postfix
    const { postfix, steps: convSteps } = infixToPostfix(tokens);

    // 3. Evaluate
    const { result, steps: evalSteps, finalStack } = evaluatePostfix(postfix);

    // Display results
    $('#postfixResult').textContent = postfix.join(' ');
    $('#finalResult').textContent = result;
    $('#results').classList.remove('hidden');

    // Visualization
    renderConversionTable(convSteps);
    renderEvalTable(evalSteps);

    // Final stack states for the visual panels
    // Operator stack should be empty after conversion
    renderStackViz('#opStackViz', []);
    renderStackViz('#evalStackViz', finalStack.toArray());

    $('#vizContainer').classList.remove('hidden');
    $('#vizPlaceholder').classList.add('hidden');

    // Smooth scroll to visualization
    setTimeout(() => {
      $('#visualization').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  } catch (err) {
    showError(err.message || 'Invalid expression');
  }
}

function clearAll() {
  $('#expression').value = '';
  clearError();
  $('#results').classList.add('hidden');
  $('#vizContainer').classList.add('hidden');
  $('#vizPlaceholder').classList.remove('hidden');
  $('#conversionBody').innerHTML = '';
  $('#evalBody').innerHTML = '';
  renderStackViz('#opStackViz', []);
  renderStackViz('#evalStackViz', []);
  $('#expression').focus();
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Calculate & Clear
  $('#calculateBtn').addEventListener('click', calculate);
  $('#clearBtn').addEventListener('click', clearAll);

  // Enter key
  $('#expression').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      calculate();
    }
  });

  // Example buttons
  $$('.example-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('#expression').value = btn.dataset.expr;
      clearError();
      calculate();
    });
  });

  // Mobile nav toggle
  const menuToggle = $('#menuToggle');
  const nav = $('.nav');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  // Active nav highlight on scroll
  const sections = ['calculator', 'how-it-works', 'algorithm', 'about'];
  const navLinks = $$('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach((id) => {
      const section = document.getElementById(id);
      if (section && window.scrollY >= section.offsetTop - 120) {
        current = id;
      }
    });
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  });

  // Close mobile nav on link click
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
    });
  });
});