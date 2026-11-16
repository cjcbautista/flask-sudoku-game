from flask import Flask, render_template, jsonify, request
import sudoku_logic
import saved_games
import random 
from flask import Flask, render_template, request, jsonify, session
app = Flask(__name__)
import os
import copy

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "dev-sudoku-secret-key"
)

# Keep a simple in-memory store for current puzzle and solution
# CURRENT = {
#     'puzzle': None,
#     'solution': None
# }

@app.route('/')
def index():
    games = saved_games.get_saved_games()
    return render_template('index.html', games=games)

@app.route('/new', methods=["POST"])
def new_game():
    # clues = int(request.args.get('clues', 35))
    data = request.get_json()
    difficulty = data.get("difficulty", "medium")

    if difficulty == "easy":
        empty_cells = 38
    elif difficulty == "hard":
        empty_cells = 53
    else:
        # Default / Normal
        difficulty = "medium"
        empty_cells = 46

    puzzle, solution = sudoku_logic.generate_puzzle(empty_cells)
    # Save game into Flask session
    session["original_puzzle"] = copy.deepcopy(puzzle)
    session["puzzle"] = puzzle
    session["solution"] = solution
    session["difficulty"] = difficulty
    # CURRENT['puzzle'] = puzzle
    # CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle})

@app.route('/is_game_in_progress', methods=["GET"])
def is_game_in_progress():
    puzzle = session.get("puzzle")
    solution = session.get("solution")
    if puzzle is None or solution is None:
        return jsonify({'error': 'No game in progress'})
    return jsonify({'puzzle': puzzle, 'solution': solution,'has_game': True})

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.json
    board = data.get('board')
    solution = session.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})

@app.route("/check_cell", methods=["POST"])
def check_cell():

    data = request.get_json()

    row = int(data["row"])
    col = int(data["col"])
    value = data["value"]

    puzzle = session.get("puzzle")
    solution = session.get("solution")

    if puzzle is None or solution is None:
        return jsonify({
            "success": False,
            "message": "No active game"
        }), 400


    # User deleted the value
    if value == "":
        puzzle[row][col] = 0

        session["puzzle"] = puzzle
        session.modified = True

        return jsonify({
            "success": True,
            "correct": None
        })


    value = int(value)

    # Update current puzzle
    puzzle[row][col] = value

    session["puzzle"] = puzzle
    session.modified = True


    # Check answer
    correct = solution[row][col] == value
    is_solved = puzzle == solution
    if is_solved:
        # Clear the session to indicate the game is completed
        session.pop("puzzle", None)
        session.pop("solution", None)
        session.pop("difficulty", None)

    return jsonify({
        "success": True,
        "correct": correct,
        "is_solved": is_solved
    })


@app.route("/hint", methods=["GET"])
def hint():
    puzzle = session.get("puzzle")
    solution = session.get("solution")
    original_puzzle = session.get("original_puzzle")

    if not puzzle or not solution or not original_puzzle:
        return jsonify({
            "success": False,
            "message": "No active game."
        }), 400

    valid_cells = []

    for row in range(9):
        for col in range(9):

            # Only cells that were originally editable
            if original_puzzle[row][col] == 0:

                # Empty or incorrect cell
                if puzzle[row][col] == 0 or puzzle[row][col] != solution[row][col]:
                    valid_cells.append((row, col))

    if not valid_cells:
        return jsonify({
            "success": False,
            "message": "No hint available."
        })

    row, col = random.choice(valid_cells)
    value = solution[row][col]

    # Update current game state
    puzzle[row][col] = value
    session["puzzle"] = puzzle
    session.modified = True

    return jsonify({
        "success": True,
        "row": row,
        "col": col,
        "value": value
    })


@app.route("/save_game", methods=["POST"])
def save_completed_game():

    data = request.get_json()

    name = data.get("name", "Anonymous")
    time_to_complete = data.get(
        "time_to_complete",
    )

    result = saved_games.save_game(
        name,
        time_to_complete,
        data.get("hint", 0)
    )

    return jsonify({
        "success": True,
        "game": result,
        'get_saved_games': saved_games.get_saved_games()
    })

if __name__ == '__main__':
    app.run(debug=True)