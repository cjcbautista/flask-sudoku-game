// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame() {
  // const res = await fetch('/new');
  // const data = await res.json();

  difficulty = document.getElementById("difficulty").value; 
  fetch("/new", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            difficulty: difficulty
        })
    })
    .then(response => response.json())
    .then(data => {

        console.log(data);

        // render your new Sudoku here
        renderPuzzle(data.puzzle);
        document.getElementById('message').innerText = '';
        sessionStorage.removeItem("sudokuStartTime");
        document.getElementById('hintCount').innerText = 'Hints: 0';
        sessionStorage.removeItem("hintCount");
        startTimer();
        
    })
    .catch(error => {
        console.error("Error:", error);
    });


}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    msg.style.color = '#388e3c';
    msg.innerText = 'Congratulations! You solved it!';
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

async function is_game_in_progress() {
    try {
        const response = await fetch("/is_game_in_progress", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        // Handle HTTP errors
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        console.log("Game status:", data);

        // Existing game found
        if (data.has_game && data.puzzle) {

            renderPuzzle(data.puzzle);

            document.getElementById("message").innerText = "";

            // Restore difficulty if backend returns it
            if (data.difficulty) {
                document.getElementById("difficulty").value =
                    data.difficulty;
            }

            // IMPORTANT:
            // Do NOT remove sudokuStartTime here.
            // We want the existing timer to continue.
            startTimer();

            return;
        }

        // No existing game
        console.log("No game in progress. Creating new game...");

        await newGame();

    } catch (error) {

        console.error(
            "Unable to check current game:",
            error
        );

        document.getElementById("message").innerText =
            "Unable to load the previous game.";
    }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  // initialize
  if(!sessionStorage.getItem("difficulty")) { // check if difficulty is already set
    sessionStorage.setItem("difficulty", 'normal');
  }

  document.getElementById("hintCount").innerText = `Hints: ${parseInt(sessionStorage.getItem("hintCount")) || 0}`;
  is_game_in_progress();
});



//toggle dark mode
const themeToggle = document.getElementById("themeToggle");

// Get saved mode
const savedMode = sessionStorage.getItem("theme");

// Restore dark mode
if (savedMode === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.innerHTML = '<i class="fa fa-moon-o" aria-hidden="true"></i>';
} else {
    document.body.classList.remove("dark-mode");
     themeToggle.innerHTML = '<i class="fa fa-sun-o" aria-hidden="true"></i>';
}


themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        themeToggle.innerHTML = '<i class="fa fa-moon-o" aria-hidden="true"></i>';
        // Save to session
        sessionStorage.setItem("theme", "dark");
    } else {
        themeToggle.innerHTML = '<i class="fa fa-sun-o" aria-hidden="true"></i>';
        // Save to session
        sessionStorage.setItem("theme", "light");
    }
});


let gameSaved = false;

async function declareSolved() {

    // Prevent duplicate saves
    if (gameSaved) {
        return;
    }

    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const finalTime =
        document.getElementById("timer").textContent;

    let name = prompt(
        `🎉 Puzzle solved in ${finalTime}!\n\nEnter your name:`
    );

    // Cancelled prompt
    if (name === null) {
        name = "Anonymous";
    }

    // Clean name
    name = name.trim();

    if (name === "") {
        name = "Anonymous";
    }

    // Prevent huge names
    if (name.length > 30) {
        name = name.substring(0, 30);
    }


    // Lock board
    setBoardDisabled(true);

    // Show saving message
    const message =
        document.getElementById("message");

    message.innerText =
        "Saving your score...";


    try {

        const response = await fetch("/save_game", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                time_to_complete: finalTime,
                hint: parseInt(sessionStorage.getItem("hintCount")) || 0
            })

        });


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message || "Unable to save game."
            );

        }


        // Mark game saved
        gameSaved = true;


        // Success message
        message.innerText =
            `🎉 Solved! ${name} completed the puzzle in ${finalTime}.`;


        // Remove active timer
        sessionStorage.removeItem(
            "sudokuStartTime"
        );


        // Update leaderboard
        if (data.saved_games) {

            renderLeaderboard(
                data.saved_games
            );

        }


        console.log(
            "Game saved:",
            data.game
        );

    }

    catch (error) {

        console.error(
            "Unable to save game:",
            error
        );


        message.innerText =
            "⚠️ Puzzle solved, but the score could not be saved.";


        // Allow another save attempt
        gameSaved = false;

    }
}

function setBoardDisabled(disabled) {

    document
        .querySelectorAll(".sudoku-cell")
        .forEach(cell => {

            cell.disabled = disabled;

        });
}

function renderLeaderboard(games) {

    const body =
        document.getElementById(
            "leaderboardTable"
        );


    body.innerHTML = "";


    // No saved games
    if (!games || games.length === 0) {

        const row =
            document.createElement("tr");


        const cell =
            document.createElement("td");


        cell.colSpan = 4;

        cell.className =
            "empty-leaderboard";

        cell.textContent =
            "No completed games yet.";


        row.appendChild(cell);

        body.appendChild(row);

        return;
    }


    games.forEach(game => {

        const row =
            document.createElement("tr");


        // Rank
        const rank =
            document.createElement("td");

        rank.textContent =
            getRankDisplay(game.rank);


        // Player
        const name =
            document.createElement("td");

        name.textContent =
            game.name;


        // Date
        const date =
            document.createElement("td");

        date.textContent =
            game.date_completed;


        // Time
        const time =
            document.createElement("td");

        time.textContent =
            game.time_to_complete;

        time.classList.add(
            "leaderboard-time"
        );
        const hints =
            document.createElement("td");

        hints.textContent =
            game.Hints || 0;

        hints.classList.add(
            "leaderboard-time"
        );


        row.appendChild(rank);
        row.appendChild(name);
        row.appendChild(date);
        row.appendChild(time);


        body.appendChild(row);

    });

}


const board = document.getElementById("sudoku-board");

let debounceTimer;

board.addEventListener("keyup", function(event) {

    if (!event.target.classList.contains("sudoku-cell")) {
        return;
    }

    const cell = event.target;

    // Cancel the previous scheduled request
    clearTimeout(debounceTimer);

    // Wait 1.5 seconds after the last keyup
    debounceTimer = setTimeout(function() {

        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        const value = cell.value;

        // Don't send request if cell is empty
        if (value === "") {
            cell.style.backgroundColor = "";
            return;
        }

        fetch("/check_cell", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                row: row,
                col: col,
                value: value
            })
        })
        .then(response => response.json())
        .then(data => {

            if (data.correct) {
                cell.style.backgroundColor = "#c8e6c9";
            } else {
                cell.style.backgroundColor = "#ffcdd2";
            }
            if (data.is_solved) {
                document.getElementById("message").innerText = "Congratulations! You solved it!";
                document.getElementById("message").style.color = "#388e3c";
                declareSolved();
            }

        })
        .catch(error => {
            console.error("Error:", error);
        });

    }, 1500);
});


let timerInterval;

function startTimer() {

    // Prevent multiple intervals running at once
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    let startTime = sessionStorage.getItem("sudokuStartTime");

    // First time opening the game
    if (!startTime) {
        startTime = Date.now();
        sessionStorage.setItem("sudokuStartTime", startTime);
    }

    function updateTimer() {

        const elapsedMilliseconds =
            Date.now() - Number(startTime);

        const totalSeconds =
            Math.floor(elapsedMilliseconds / 1000);

        const minutes =
            Math.floor(totalSeconds / 60);

        const seconds =
            totalSeconds % 60;

        document.getElementById("timer").textContent =
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0");
    }

    updateTimer();

    timerInterval = setInterval(updateTimer, 1000);
}

// const newGameBtn = document.getElementById("start-game");

// newGameBtn.addEventListener("click", function () {

//     newGame();
//     startTimer()
// });

const difficultySelect = document.getElementById("difficulty");

// Restore difficulty
const savedDifficulty = sessionStorage.getItem("difficulty");

if (savedDifficulty) {
    difficultySelect.value = savedDifficulty;
}

// Save when changed
difficultySelect.addEventListener("change", function () {
    sessionStorage.setItem("difficulty", this.value);
});


async function getHint() {
    const response = await fetch("/hint");
    const data = await response.json();

    if (!data.success) {
        alert(data.message);
        return;
    }

    const cell = document.querySelector(
        `.sudoku-cell[data-row="${data.row}"][data-col="${data.col}"]`
    );

    if (cell) {
        cell.value = data.value;
        cell.classList.remove("incorrect");
        cell.classList.add("hint-cell");
    }
}
const hintBtn = document.getElementById("hintBtn");

hintBtn.addEventListener("click", function () {
    getHint();
});