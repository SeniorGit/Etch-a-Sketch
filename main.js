"use strict";

const ASPECT_RATIO = 3 / 4;
const DENSE_GRID_FROM = 48;
const DEGREES_PER_CELL = 15;
const SHAKE_MS = 450;

const frame = document.querySelector("#frame");
const sketchScreen = document.querySelector("#screen");
const board = document.querySelector("#board");
const stylus = document.querySelector("#stylus");
const drawBtn = document.querySelector("#drawBtn");
const eraseBtn = document.querySelector("#eraseBtn");
const clearBtn = document.querySelector("#clearBtn");
const gridSizeSlider = document.querySelector("#gridSize");
const gridSizeValue = document.querySelector("#gridSizeValue");
const knobX = document.querySelector("#knobX");
const knobY = document.querySelector("#knobY");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  cols: 0,
  rows: 0,
  mode: "draw",
  isStroking: false,
  x: 0,
  y: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const rowsFor = (cols) => Math.max(2, Math.round(cols * ASPECT_RATIO));

function createGrid(cols) {
  state.cols = cols;
  state.rows = rowsFor(cols);

  sketchScreen.style.setProperty("--cols", state.cols);
  sketchScreen.style.setProperty("--rows", state.rows);
  sketchScreen.classList.toggle("is-dense", cols > DENSE_GRID_FROM);

  const cells = document.createDocumentFragment();
  for (let i = 0; i < state.cols * state.rows; i++) {
    cells.append(document.createElement("div"));
  }
  board.replaceChildren(cells);

  setStylus(Math.floor(state.cols / 2), Math.floor(state.rows / 2));
}

function clearGrid() {
  for (const cell of board.querySelectorAll(".is-inked")) {
    cell.classList.remove("is-inked");
  }
}

let pendingRebuild = 0;

function setGridSize(cols) {
  gridSizeValue.textContent = `${cols} × ${rowsFor(cols)}`;
  cancelAnimationFrame(pendingRebuild);
  pendingRebuild = requestAnimationFrame(() => createGrid(cols));
}

function resetBoard() {
  if (reducedMotion.matches) {
    clearGrid();
    return;
  }
  if (frame.classList.contains("is-shaking")) return;
  frame.classList.add("is-shaking");
  setTimeout(clearGrid, SHAKE_MS * 0.4);
  setTimeout(() => frame.classList.remove("is-shaking"), SHAKE_MS);
}

function setDrawingMode(mode) {
  state.mode = mode;
  sketchScreen.dataset.tool = mode === "erase" ? "eraser" : "pen";
  drawBtn.setAttribute("aria-pressed", mode === "draw");
  eraseBtn.setAttribute("aria-pressed", mode === "erase");
}

function paintCell(x, y) {
  board.children[y * state.cols + x].classList.toggle("is-inked", state.mode === "draw");
}

function paintLine(from, to) {
  let { x, y } = from;
  const dx = Math.abs(to.x - x);
  const dy = -Math.abs(to.y - y);
  const stepX = x < to.x ? 1 : -1;
  const stepY = y < to.y ? 1 : -1;
  let error = dx + dy;

  while (true) {
    paintCell(x, y);
    if (x === to.x && y === to.y) return;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += stepX;
    }
    if (doubled <= dx) {
      error += dx;
      y += stepY;
    }
  }
}

function setStylus(x, y) {
  state.x = x;
  state.y = y;
  stylus.style.transform = `translate(${x * 100}%, ${y * 100}%)`;

  knobX.setAttribute("aria-valuemin", 1);
  knobX.setAttribute("aria-valuemax", state.cols);
  knobX.setAttribute("aria-valuenow", x + 1);
  knobX.setAttribute("aria-valuetext", `Column ${x + 1} of ${state.cols}`);

  const height = state.rows - y;
  knobY.setAttribute("aria-valuemin", 1);
  knobY.setAttribute("aria-valuemax", state.rows);
  knobY.setAttribute("aria-valuenow", height);
  knobY.setAttribute("aria-valuetext", `Row ${height} of ${state.rows}, counted from the bottom`);
}

function showStylus(isVisible) {
  stylus.classList.toggle("is-visible", isVisible);
}

function moveStylus(dx, dy) {
  const to = {
    x: clamp(state.x + dx, 0, state.cols - 1),
    y: clamp(state.y + dy, 0, state.rows - 1),
  };
  showStylus(true);
  if (to.x === state.x && to.y === state.y) return;
  paintLine(state, to);
  setStylus(to.x, to.y);
}

function cellAt(event) {
  const rect = board.getBoundingClientRect();
  return {
    x: clamp(Math.floor(((event.clientX - rect.left) / rect.width) * state.cols), 0, state.cols - 1),
    y: clamp(Math.floor(((event.clientY - rect.top) / rect.height) * state.rows), 0, state.rows - 1),
  };
}

function handleDrawing(event) {
  const cell = cellAt(event);
  showStylus(event.pointerType === "mouse");
  if (cell.x === state.x && cell.y === state.y) return;
  if (state.isStroking) paintLine(state, cell);
  setStylus(cell.x, cell.y);
}

board.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  board.setPointerCapture(event.pointerId);
  state.isStroking = true;
  const cell = cellAt(event);
  showStylus(event.pointerType === "mouse");
  paintCell(cell.x, cell.y);
  setStylus(cell.x, cell.y);
});

board.addEventListener("pointermove", handleDrawing);

const endStroke = () => {
  state.isStroking = false;
};
board.addEventListener("pointerup", endStroke);
board.addEventListener("pointercancel", endStroke);
board.addEventListener("lostpointercapture", endStroke);
board.addEventListener("pointerleave", () => showStylus(false));

const ARROW_STEPS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

sketchScreen.addEventListener("keydown", (event) => {
  const step = ARROW_STEPS[event.key];
  if (!step) return;
  event.preventDefault();
  moveStylus(...step);
});

function setupKnob(well, axis, keys) {
  const dial = well.querySelector(".knob-dial");
  let turn = 0;
  let stepped = 0;
  let lastAngle = null;

  function rotate(degrees) {
    turn += degrees;
    dial.style.transform = `rotate(${turn}deg)`;

    const steps = Math.trunc((turn - stepped) / DEGREES_PER_CELL);
    if (steps === 0) return;
    stepped += steps * DEGREES_PER_CELL;
    if (axis === "x") moveStylus(steps, 0);
    else moveStylus(0, -steps);
  }

  const angleOf = (event) => {
    const rect = well.getBoundingClientRect();
    return (
      Math.atan2(
        event.clientY - (rect.top + rect.height / 2),
        event.clientX - (rect.left + rect.width / 2),
      ) *
      (180 / Math.PI)
    );
  };

  well.addEventListener("pointerdown", (event) => {
    well.setPointerCapture(event.pointerId);
    lastAngle = angleOf(event);
  });

  well.addEventListener("pointermove", (event) => {
    if (lastAngle === null) return;
    const angle = angleOf(event);
    let delta = angle - lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle = angle;
    rotate(delta);
  });

  const release = () => {
    lastAngle = null;
  };
  well.addEventListener("pointerup", release);
  well.addEventListener("pointercancel", release);
  well.addEventListener("lostpointercapture", release);

  well.addEventListener("keydown", (event) => {
    const direction = keys[event.key];
    if (!direction) return;
    event.preventDefault();
    turn = stepped;
    rotate(direction * DEGREES_PER_CELL);
  });
}

setupKnob(knobX, "x", { ArrowRight: 1, ArrowLeft: -1 });
setupKnob(knobY, "y", { ArrowUp: 1, ArrowDown: -1 });

drawBtn.addEventListener("click", () => setDrawingMode("draw"));
eraseBtn.addEventListener("click", () => setDrawingMode("erase"));
clearBtn.addEventListener("click", resetBoard);
gridSizeSlider.addEventListener("input", () => setGridSize(Number(gridSizeSlider.value)));

setDrawingMode("draw");
const initialCols = Number(gridSizeSlider.value);
gridSizeValue.textContent = `${initialCols} × ${rowsFor(initialCols)}`;
createGrid(initialCols);
