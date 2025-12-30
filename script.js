/**
 * Sudoku Game Logic
 */

class SudokuGame {
    constructor() {
        this.grid = Array(81).fill(0);
        this.solution = Array(81).fill(0);
        this.initialGrid = Array(81).fill(0);
        this.history = [];
        this.mistakes = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.selectedCell = null;
        this.difficulty = 'medium'; // easy, medium, hard
        this.numberCounts = Array(10).fill(0);
        this.isPaused = false;
        this.isNoteMode = false;
        this.conflicts = new Set();
        this.notes = Array.from({ length: 81 }, () => new Set());

        this.initDOM();
        this.initEvents();
        this.startNewGame();
    }

    initDOM() {
        this.gridEl = document.getElementById('sudoku-grid');
        this.numpadEl = document.getElementById('numpad');
        this.timerEl = document.getElementById('timer-display');
        this.difficultySelect = document.getElementById('difficulty-select');
        this.winModal = document.getElementById('win-modal');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.pauseBtn = document.getElementById('pause-btn');
        this.noteBtn = document.getElementById('note-btn');

        // Render Grid
        this.gridEl.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            this.gridEl.appendChild(cell);
        }

        // Render Numpad
        this.numpadEl.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('button');
            btn.className = 'num-btn';
            btn.dataset.num = i;
            btn.innerHTML = `${i}<span class="count">0/9</span>`;
            this.numpadEl.appendChild(btn);
        }
    }

    initEvents() {
        this.gridEl.addEventListener('click', (e) => {
            if (this.isPaused) return;
            const cell = e.target.closest('.cell');
            if (cell) this.selectCell(parseInt(cell.dataset.index));
        });

        this.numpadEl.addEventListener('click', (e) => {
            if (this.isPaused) return;
            const btn = e.target.closest('.num-btn');
            if (btn && !btn.disabled) this.fillNumber(parseInt(btn.dataset.num));
        });

        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.startNewGame();
        });

        document.addEventListener('keydown', (e) => {
            if (this.isPaused) return;
            if (this.selectedCell !== null) {
                if (e.key >= '1' && e.key <= '9') {
                    this.fillNumber(parseInt(e.key));
                } else if (e.key === 'Backspace' || e.key === 'Delete') {
                    this.fillNumber(0);
                } else if (e.key === 'ArrowUp') {
                    this.moveSelection(-1, 0);
                } else if (e.key === 'ArrowDown') {
                    this.moveSelection(1, 0);
                } else if (e.key === 'ArrowLeft') {
                    this.moveSelection(0, -1);
                } else if (e.key === 'ArrowRight') {
                    this.moveSelection(0, 1);
                }
            }

            if (e.key.toLowerCase() === 'n') {
                this.toggleNoteMode();
            }

            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                this.undo();
            }
        });

        this.pauseBtn.onclick = () => this.togglePause();
        this.noteBtn.onclick = () => this.toggleNoteMode();
        document.getElementById('resume-btn').onclick = () => this.togglePause();
        document.getElementById('undo-btn').onclick = () => this.undo();
        document.getElementById('new-game-btn').onclick = () => this.startNewGame();
        document.getElementById('play-again-btn').onclick = () => {
            this.winModal.classList.add('hidden');
            this.startNewGame();
        };
        document.getElementById('hint-btn').onclick = () => this.giveHint();
    }

    toggleNoteMode() {
        this.isNoteMode = !this.isNoteMode;
        this.noteBtn.classList.toggle('active', this.isNoteMode);
        this.noteBtn.querySelector('span').textContent = `筆記: ${this.isNoteMode ? '開' : '關'}`;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            clearInterval(this.timerInterval);
            this.pauseOverlay.classList.remove('hidden');
            this.pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>';
        } else {
            this.startTimer();
            this.pauseOverlay.classList.add('hidden');
            this.pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>';
        }
    }

    moveSelection(dr, dc) {
        if (this.selectedCell === null) {
            this.selectCell(0);
            return;
        }
        let r = Math.floor(this.selectedCell / 9);
        let c = this.selectedCell % 9;

        r = (r + dr + 9) % 9;
        c = (c + dc + 9) % 9;

        this.selectCell(r * 9 + c);
    }

    startNewGame() {
        this.resetState();
        this.generatePuzzle();
        this.render();
        this.startTimer();
    }

    resetState() {
        this.mistakes = 0;
        this.timer = 0;
        this.history = [];
        this.selectedCell = null;
        this.isPaused = false;
        this.isNoteMode = false;
        this.conflicts.clear();
        this.notes = Array.from({ length: 81 }, () => new Set());
        this.noteBtn.classList.remove('active');
        this.noteBtn.querySelector('span').textContent = '筆記: 關';
        this.pauseOverlay.classList.add('hidden');
        this.pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>';
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    generatePuzzle() {
        this.solution = this.solveSudoku(Array(81).fill(0));
        this.grid = [...this.solution];

        let removeCount;
        if (this.difficulty === 'easy') removeCount = 81 - (Math.floor(Math.random() * 6) + 35);
        else if (this.difficulty === 'medium') removeCount = 81 - (Math.floor(Math.random() * 6) + 25);
        else removeCount = 81 - (Math.floor(Math.random() * 6) + 17);

        while (removeCount > 0) {
            let idx = Math.floor(Math.random() * 81);
            if (this.grid[idx] !== 0) {
                this.grid[idx] = 0;
                removeCount--;
            }
        }
        this.initialGrid = [...this.grid];
        this.findConflicts();
        this.updateNumberCounts();
    }

    solveSudoku(board) {
        const solved = [...board];
        const solve = () => {
            for (let i = 0; i < 81; i++) {
                if (solved[i] === 0) {
                    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                    for (let n of nums) {
                        if (this.isValid(solved, i, n)) {
                            solved[i] = n;
                            if (solve()) return true;
                            solved[i] = 0;
                        }
                    }
                    return false;
                }
            }
            return true;
        };
        solve();
        return solved;
    }

    isValid(board, idx, num) {
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;

        for (let i = 0; i < 9; i++) {
            if (i !== c && board[r * 9 + i] === num) return false;
            if (i !== r && board[i * 9 + c] === num) return false;
            const bi = (br + Math.floor(i / 3)) * 9 + (bc + i % 3);
            if (bi !== idx && board[bi] === num) return false;
        }
        return true;
    }

    findConflicts() {
        this.conflicts.clear();
        for (let i = 0; i < 81; i++) {
            const val = this.grid[i];
            if (val !== 0) {
                if (!this.isValid(this.grid, i, val)) {
                    this.conflicts.add(i);
                }
            }
        }
    }

    selectCell(idx) {
        this.selectedCell = idx;
        this.renderHighlights();
    }

    fillNumber(num) {
        if (this.selectedCell === null || this.initialGrid[this.selectedCell] !== 0) return;

        if (this.isNoteMode) {
            if (num === 0) {
                this.notes[this.selectedCell].clear();
            } else {
                if (this.notes[this.selectedCell].has(num)) {
                    this.notes[this.selectedCell].delete(num);
                } else {
                    this.notes[this.selectedCell].add(num);
                }
            }
            this.render();
            return;
        }

        const prevNum = this.grid[this.selectedCell];
        if (prevNum === num) return;

        this.history.push({
            idx: this.selectedCell,
            prev: prevNum,
            next: num,
            prevNotes: new Set(this.notes[this.selectedCell])
        });

        this.grid[this.selectedCell] = num;

        if (num !== 0) {
            this.notes[this.selectedCell].clear();
            this.autoClearNotes(this.selectedCell, num);
        }

        this.findConflicts();
        this.updateNumberCounts();
        this.render();
        this.checkWin();
    }

    autoClearNotes(idx, num) {
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;

        for (let i = 0; i < 9; i++) {
            // Row
            this.notes[r * 9 + i].delete(num);
            // Column
            this.notes[i * 9 + c].delete(num);
            // Box
            const bi = (br + Math.floor(i / 3)) * 9 + (bc + (i % 3));
            this.notes[bi].delete(num);
        }
    }

    undo() {
        if (this.history.length === 0) return;
        const action = this.history.pop();
        this.grid[action.idx] = action.prev;
        if (action.prevNotes) {
            this.notes[action.idx] = action.prevNotes;
        }
        this.findConflicts();
        this.updateNumberCounts();
        this.render();
    }

    giveHint() {
        const emptyCells = this.grid.map((v, i) => v === 0 ? i : -1).filter(v => v !== -1);
        if (emptyCells.length === 0) return;

        let targetIdx;
        if (this.selectedCell !== null && this.grid[this.selectedCell] === 0) {
            targetIdx = this.selectedCell;
        } else {
            targetIdx = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }

        this.selectedCell = targetIdx;
        this.fillNumber(this.solution[targetIdx]);
    }

    updateNumberCounts() {
        this.numberCounts.fill(0);
        this.grid.forEach((num, i) => {
            if (num !== 0 && !this.conflicts.has(i)) {
                this.numberCounts[num]++;
            }
        });

        const btns = this.numpadEl.querySelectorAll('.num-btn');
        btns.forEach(btn => {
            const num = parseInt(btn.dataset.num);
            const count = this.numberCounts[num];
            btn.querySelector('.count').textContent = `${count}/9`;
            btn.disabled = count >= 9;
        });
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.isPaused = false;
        this.timerInterval = setInterval(() => {
            this.timer++;
            const mins = Math.floor(this.timer / 60).toString().padStart(2, '0');
            const secs = (this.timer % 60).toString().padStart(2, '0');
            this.timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    checkWin() {
        const isFull = this.grid.every(v => v !== 0);
        if (!isFull) return;

        // A win is either matching the solution OR being logically valid (if multiple solutions exist)
        const isMatch = this.grid.every((v, i) => v === this.solution[i]);
        const isLogicallyValid = !Array.from({ length: 81 }).some((_, i) => !this.isValid(this.grid, i, this.grid[i]));

        if (isMatch || isLogicallyValid) {
            clearInterval(this.timerInterval);
            this.winModal.classList.remove('hidden');
        } else {
            // It's full but wrong, render will show errors
            this.render();
        }
    }

    render() {
        const cells = this.gridEl.querySelectorAll('.cell');
        const isFull = this.grid.every(v => v !== 0);

        cells.forEach((cell, i) => {
            const val = this.grid[i];
            cell.innerHTML = ''; // Clear cell
            cell.classList.remove('initial', 'user-filled', 'error', 'conflict');

            if (this.initialGrid[i] !== 0) {
                cell.textContent = val;
                cell.classList.add('initial');
            } else if (val !== 0) {
                cell.textContent = val;
                cell.classList.add('user-filled');
                if (isFull && val !== this.solution[i]) {
                    cell.classList.add('error');
                }
            } else if (this.notes[i].size > 0) {
                const noteGrid = document.createElement('div');
                noteGrid.className = 'note-grid';
                for (let n = 1; n <= 9; n++) {
                    const noteItem = document.createElement('div');
                    noteItem.className = 'note-item';
                    noteItem.textContent = this.notes[i].has(n) ? n : '';
                    noteGrid.appendChild(noteItem);
                }
                cell.appendChild(noteGrid);
            }

            if (this.conflicts.has(i)) {
                cell.classList.add('conflict');
            }
        });
        this.renderHighlights();
    }

    renderHighlights() {
        const cells = this.gridEl.querySelectorAll('.cell');
        const selectedIdx = this.selectedCell;

        cells.forEach((cell, i) => {
            cell.classList.remove('selected', 'highlighted');
            if (selectedIdx === null) return;

            const r = Math.floor(i / 9);
            const c = i % 9;
            const sr = Math.floor(selectedIdx / 9);
            const sc = selectedIdx % 9;
            const sbr = Math.floor(sr / 3) * 3;
            const sbc = Math.floor(sc / 3) * 3;
            const br = Math.floor(r / 3) * 3;
            const bc = Math.floor(c / 3) * 3;

            if (i === selectedIdx) {
                cell.classList.add('selected');
            } else if (r === sr || c === sc || (br === sbr && bc === sbc)) {
                cell.classList.add('highlighted');
            }

            if (this.grid[i] !== 0 && selectedIdx !== null && this.grid[i] === this.grid[selectedIdx]) {
                cell.classList.add('selected');
            }
        });
    }
}

// Start Game
window.onload = () => new SudokuGame();
