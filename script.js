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
        this.theme = localStorage.getItem('sudoku-theme') || 'light';

        this.initTheme();
        this.initDOM();
        this.initEvents();
        this.startNewGame();
    }

    initDOM() {
        this.gridEl = document.getElementById('sudoku-grid');
        this.numpadEl = document.getElementById('numpad');
        this.timerEl = document.getElementById('timer-display');
        this.difficultySelect = document.getElementById('difficulty-select');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.pauseBtn = document.getElementById('pause-btn');
        this.noteBtn = document.getElementById('note-btn');
        this.themeBtn = document.getElementById('theme-btn');
        this.themeIcon = document.getElementById('theme-icon');

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
        this.noteBtn.onclick = () => {
            if (this.isPaused) return;
            this.toggleNoteMode();
        };
        this.themeBtn.onclick = () => this.toggleTheme();
        document.getElementById('undo-btn').onclick = () => {
            if (this.isPaused) return;
            this.undo();
        };
        document.getElementById('new-game-btn').onclick = () => this.startNewGame();
        document.getElementById('play-again-btn').onclick = () => {
            document.getElementById('result-card').classList.add('hidden');
            this.startNewGame();
        };
        document.getElementById('result-close-btn').onclick = () => {
            document.getElementById('result-card').classList.add('hidden');
        };
        document.getElementById('hint-btn').onclick = () => {
            if (this.isPaused) return;
            this.giveHint();
        };
        document.getElementById('profile-btn').onclick = () => {
            window.progressSystem.openProfileModal();
        };
        document.getElementById('profile-close-btn').onclick = () => {
            document.getElementById('profile-modal').classList.add('hidden');
        };
    }

    initTheme() {
        if (this.theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('sudoku-theme', this.theme);
        this.initTheme();
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        if (this.theme === 'light') {
            // Sun icon
            this.themeIcon.innerHTML = '<path fill="currentColor" d="M12,7L14,9H17V12L19,14L17,16V19H14L12,21L10,19H7V16L5,14L7,12V9H10L12,7M12,11A3,3 0 0,0 9,14A3,3 0 0,0 12,17A3,3 0 0,0 15,14A3,3 0 0,0 12,11M12,2L14.39,4.39L17.78,4.39L17.78,7.78L20.17,10.17L20.17,13.83L17.78,16.22L17.78,19.61L14.39,19.61L12,22L9.61,19.61L6.22,19.61L6.22,16.22L3.83,13.83L3.83,10.17L6.22,7.78L6.22,4.39L9.61,4.39L12,2Z" />';
        } else {
            // Moon icon
            this.themeIcon.innerHTML = '<path fill="currentColor" d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />';
        }
    }

    toggleNoteMode() {
        this.isNoteMode = !this.isNoteMode;
        this.noteBtn.classList.toggle('active', this.isNoteMode);
        this.noteBtn.querySelector('span').textContent = '筆記';
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
        this.difficulty = this.difficultySelect.value;
        // If previous game was in progress (not won), reset streak
        if (this.grid && this.grid.some(v => v !== 0) && !this.gameWon) {
            window.progressSystem.resetStreak();
        }
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
        this.gameWon = false;
        this.conflicts.clear();
        this.notes = Array.from({ length: 81 }, () => new Set());
        this.noteBtn.classList.remove('active');
        this.noteBtn.querySelector('span').textContent = '筆記';
        this.pauseOverlay.classList.add('hidden');
        this.pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>';
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    generatePuzzle() {
        this.solution = this.solveSudoku(Array(81).fill(0));
        this.grid = [...this.solution];

        // Shuffle removal order randomly
        const indices = Array.from({ length: 81 }, (_, i) => i)
            .sort(() => Math.random() - 0.5);

        for (const idx of indices) {
            const backup = this.grid[idx];
            this.grid[idx] = 0;

            if (!this.isRemovalValid(this.grid)) {
                this.grid[idx] = backup;
            }
        }

        this.initialGrid = [...this.grid];
        this.findConflicts();
        this.updateNumberCounts();
    }

    // Check if the current puzzle is valid for the selected difficulty
    isRemovalValid(board) {
        if (this.difficulty === 'easy') {
            return this.canSolveByNakedSingles(board);
        } else if (this.difficulty === 'medium') {
            return this.canSolveByHiddenSingles(board);
        } else {
            // Hard: valid if unique solution exists
            return this.countSolutions(board, 2) === 1;
        }
    }

    // Get valid numbers for a cell
    getPossible(board, idx) {
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        const used = new Set();
        for (let i = 0; i < 9; i++) {
            used.add(board[r * 9 + i]);
            used.add(board[i * 9 + c]);
            used.add(board[(br + Math.floor(i / 3)) * 9 + (bc + i % 3)]);
        }
        return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !used.has(n));
    }

    // Easy: puzzle can be fully solved by only filling cells with one possible number
    canSolveByNakedSingles(board) {
        const working = [...board];
        let progress = true;
        while (progress) {
            progress = false;
            for (let i = 0; i < 81; i++) {
                if (working[i] !== 0) continue;
                const p = this.getPossible(working, i);
                if (p.length === 0) return false;
                if (p.length === 1) {
                    working[i] = p[0];
                    progress = true;
                }
            }
        }
        return working.every(v => v !== 0);
    }

    // Medium: naked singles + hidden singles (a number can only go in one cell in row/col/box)
    canSolveByHiddenSingles(board) {
        const working = [...board];
        let progress = true;
        while (progress) {
            progress = false;
            // Naked singles
            for (let i = 0; i < 81; i++) {
                if (working[i] !== 0) continue;
                const p = this.getPossible(working, i);
                if (p.length === 0) return false;
                if (p.length === 1) {
                    working[i] = p[0];
                    progress = true;
                }
            }
            // Hidden singles: check rows, cols, boxes
            for (let num = 1; num <= 9; num++) {
                for (let unit = 0; unit < 9; unit++) {
                    // Row
                    const rowPos = [];
                    for (let c = 0; c < 9; c++) {
                        const i = unit * 9 + c;
                        if (working[i] === 0 && this.getPossible(working, i).includes(num)) rowPos.push(i);
                    }
                    if (rowPos.length === 1) { working[rowPos[0]] = num; progress = true; }

                    // Col
                    const colPos = [];
                    for (let r = 0; r < 9; r++) {
                        const i = r * 9 + unit;
                        if (working[i] === 0 && this.getPossible(working, i).includes(num)) colPos.push(i);
                    }
                    if (colPos.length === 1) { working[colPos[0]] = num; progress = true; }

                    // Box
                    const br = Math.floor(unit / 3) * 3;
                    const bc = (unit % 3) * 3;
                    const boxPos = [];
                    for (let dr = 0; dr < 3; dr++) {
                        for (let dc = 0; dc < 3; dc++) {
                            const i = (br + dr) * 9 + (bc + dc);
                            if (working[i] === 0 && this.getPossible(working, i).includes(num)) boxPos.push(i);
                        }
                    }
                    if (boxPos.length === 1) { working[boxPos[0]] = num; progress = true; }
                }
            }
        }
        return working.every(v => v !== 0);
    }

    // Count solutions, stop early at limit (for uniqueness check)
    countSolutions(board, limit) {
        const working = [...board];
        let count = 0;
        const solve = () => {
            const idx = working.indexOf(0);
            if (idx === -1) { count++; return; }
            for (const num of this.getPossible(working, idx)) {
                working[idx] = num;
                solve();
                if (count >= limit) return;
                working[idx] = 0;
            }
        };
        solve();
        return count;
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

        const isMatch = this.grid.every((v, i) => v === this.solution[i]);
        const isLogicallyValid = !Array.from({ length: 81 }).some((_, i) => !this.isValid(this.grid, i, this.grid[i]));

        if (isMatch || isLogicallyValid) {
            clearInterval(this.timerInterval);
            this.gameWon = true;
            // Award XP and show result card
            const result = window.progressSystem.recordWin(this.difficulty, this.timer);
            this.showResultCard(result);
        } else {
            this.render();
        }
    }

    showResultCard(result) {
        const card = document.getElementById('result-card');
        document.getElementById('result-xp').textContent = `+${result.xpEarned} XP`;
        document.getElementById('result-streak').textContent = result.streak;
        document.getElementById('result-level-title').textContent = result.levelTitle;
        document.getElementById('result-level-num').textContent = `Lv.${result.level}`;

        const bar = document.getElementById('result-xp-bar');
        bar.style.width = '0%';
        const barFill = document.getElementById('result-xp-bar-fill');
        barFill.style.width = '0%';

        const resultTime = document.getElementById('result-time');
        resultTime.textContent = `⏱️ 最終完成時間：${window.progressSystem.formatTime(this.timer)}`;

        const levelUp = document.getElementById('result-levelup');
        if (result.leveledUp) {
            levelUp.textContent = `🎉 升級！${result.levelTitle}`;
            levelUp.classList.remove('hidden');
        } else {
            levelUp.classList.add('hidden');
        }

        card.classList.remove('hidden');

        // Animate XP bar
        requestAnimationFrame(() => {
            setTimeout(() => {
                barFill.style.width = `${result.xpPercent}%`;
            }, 100);
        });
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

// =================== PROGRESS SYSTEM ===================
class ProgressSystem {
    constructor() {
        this.LEVELS = [
            { level: 1, title: '🌱 見習者', xpRequired: 0 },
            { level: 2, title: '📖 學徒', xpRequired: 200 },
            { level: 3, title: '🔍 探索者', xpRequired: 600 },
            { level: 4, title: '⚡ 解謎師', xpRequired: 1200 },
            { level: 5, title: '🎯 策略家', xpRequired: 2500 },
            { level: 6, title: '💎 洞察者', xpRequired: 4500 },
            { level: 7, title: '🏔 挑戰者', xpRequired: 7500 },
            { level: 8, title: '🌟 數獨士', xpRequired: 12000 },
            { level: 9, title: '👑 大師', xpRequired: 20000 },
            { level: 10, title: '✨ 數獨傳說', xpRequired: 35000 },
        ];
        this.SPEED_THRESHOLDS = { easy: 300, medium: 480, hard: 900 }; // seconds
        this.BASE_XP = { easy: 50, medium: 100, hard: 200 };
        this.data = this.load();
        this.updateProfileBtn();
    }

    load() {
        try {
            const saved = localStorage.getItem('sudoku-progress');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return {
            totalXP: 0,
            streak: 0,
            bestTimes: { easy: null, medium: null, hard: null },
            totalGames: 0,
            totalWins: 0,
        };
    }

    save() {
        localStorage.setItem('sudoku-progress', JSON.stringify(this.data));
    }

    resetStreak() {
        if (this.data.streak > 0) {
            this.data.streak = 0;
            this.save();
        }
    }

    getLevelInfo(xp) {
        let current = this.LEVELS[0];
        for (const lvl of this.LEVELS) {
            if (xp >= lvl.xpRequired) current = lvl;
        }
        const nextIdx = this.LEVELS.indexOf(current) + 1;
        const next = this.LEVELS[nextIdx] || null;
        const xpInLevel = xp - current.xpRequired;
        const xpToNext = next ? next.xpRequired - current.xpRequired : 1;
        const percent = next ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100;
        return { level: current.level, title: current.title, percent, next };
    }

    calcXP(difficulty, seconds) {
        let xp = this.BASE_XP[difficulty] || 50;
        // Speed bonus
        if (seconds <= this.SPEED_THRESHOLDS[difficulty]) xp = Math.round(xp * 1.5);
        // Streak bonus
        const streakMul = this.data.streak >= 10 ? 2.0
            : this.data.streak >= 5 ? 1.5
                : this.data.streak >= 3 ? 1.2 : 1.0;
        xp = Math.round(xp * streakMul);
        return xp;
    }

    recordWin(difficulty, seconds) {
        const prevXP = this.data.totalXP;
        const prevLevel = this.getLevelInfo(prevXP);

        // Streak — simple consecutive wins
        this.data.streak++;


        // Best time
        const isNewBest = !this.data.bestTimes[difficulty] || seconds < this.data.bestTimes[difficulty];
        if (isNewBest) this.data.bestTimes[difficulty] = seconds;

        // XP
        const xpEarned = this.calcXP(difficulty, seconds);
        this.data.totalXP += xpEarned;
        this.data.totalGames++;
        this.data.totalWins++;
        this.save();
        this.updateProfileBtn();

        const newLevel = this.getLevelInfo(this.data.totalXP);
        return {
            xpEarned,
            totalXP: this.data.totalXP,
            streak: this.data.streak,
            level: newLevel.level,
            levelTitle: newLevel.title,
            xpPercent: newLevel.percent,
            leveledUp: newLevel.level > prevLevel.level,
            isNewBest,
        };
    }

    formatTime(seconds) {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    updateProfileBtn() {
        const lvl = this.getLevelInfo(this.data.totalXP);
        const btn = document.getElementById('profile-btn-text');
        if (btn) btn.textContent = lvl.title;
    }

    openProfileModal() {
        const lvl = this.getLevelInfo(this.data.totalXP);
        document.getElementById('profile-level-badge').textContent = `Lv.${lvl.level}`;
        document.getElementById('profile-level-title').textContent = lvl.title;
        document.getElementById('profile-total-xp').textContent = this.data.totalXP;

        const LEVELS = this.LEVELS;
        const nextLvl = LEVELS.find(l => l.level === lvl.level + 1);
        document.getElementById('profile-next-xp').textContent = nextLvl ? nextLvl.xpRequired : this.data.totalXP;

        const bar = document.getElementById('profile-xp-bar-fill');
        bar.style.width = `${lvl.percent}%`;

        document.getElementById('pstat-total').textContent = this.data.totalGames;
        document.getElementById('pstat-wins').textContent = this.data.totalWins;
        document.getElementById('pstat-streak').textContent = this.data.streak;
        document.getElementById('pstat-easy').textContent = this.formatTime(this.data.bestTimes.easy);
        document.getElementById('pstat-medium').textContent = this.formatTime(this.data.bestTimes.medium);
        document.getElementById('pstat-hard').textContent = this.formatTime(this.data.bestTimes.hard);

        document.getElementById('profile-modal').classList.remove('hidden');

        // Wire export/import
        document.getElementById('export-btn').onclick = () => this.exportProgress();
        document.getElementById('import-file').onchange = (e) => this.importProgress(e);
    }

    exportProgress() {
        const dataStr = JSON.stringify({ version: 1, ...this.data }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sudoku-progress-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importProgress(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                // Validate essential keys
                if (typeof parsed.totalXP !== 'number') throw new Error('invalid');
                const { version, ...progressData } = parsed;
                this.data = { ...this.load(), ...progressData };
                this.save();
                this.openProfileModal(); // Refresh display
                alert('✅ 進度已匯入成功！');
            } catch {
                alert('❌ 匯入失敗，請確認檔案格式是否正確。');
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be re-imported if needed
        event.target.value = '';
    }
}

// Start Game
window.onload = () => {
    window.progressSystem = new ProgressSystem();
    new SudokuGame();
};
