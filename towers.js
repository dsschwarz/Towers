//var boardSize = parseInt(prompt("Board Size"));

// TODO change unique key generation
// Should not need to generate all possible boards.
// Instead, create a key, solve until next step is ambiguous.
// Add a new clue to the key, to narrow down to one step, continue solving

var boardSize = 4;
var sizeSq = boardSize*boardSize;
var printLength = boardSize*4 + sizeSq;

function set() {
    var tempSet = {};

    heights().forEach(function(h) {
        tempSet[h] = true;
    });

    return tempSet;
}

function heights() {
    var a = [];
    for (var i=0; i < boardSize; i++) {
        a.push(i+1);
    }
    return a;
}

// From SO
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function generateBoards() {
    var board = [];
    var validBoards = [];
    for (var i=0; i < boardSize; i++) {
        var a = [];
        for (var j=0; j < boardSize; j++) {
            a.push(null);
        }
        board.push(a);
    }
    function setCell(rowIndex, colIndex) {
        // This function sets a cell to each possible number
        // If there is no valid number, returns
        // Otherwise, sets the next cell (left to right, top to bottom)
        // If cell is the last cell, board configuration must be valid, adds it to list of valid boards
        

        var available = set(); // List of valid numbers
        // Exclude numbers in same column
        board.slice(0, rowIndex).forEach(function(higherRow){
            delete available[higherRow[colIndex]]
        });
        //Exclude numbers in the same row
        board[rowIndex].slice(0, colIndex).forEach(function(height) {
            delete available[height];
        });
        available = Object.keys(available);
        if (!available.length) {
            // No valid board. pop up a level
            return;
        }
        for (var i = 0; i < available.length; i++) {
            board[rowIndex][colIndex] = parseInt(available[i]);
            var newCol = (colIndex + 1);
            if (newCol > 3) {
                if (rowIndex >= 3) {
                    // Copy board to valid board
                    var copiedBoard = [
                        board[0].slice(),
                        board[1].slice(),
                        board[2].slice(),
                        board[3].slice()
                    ];
                    validBoards.push(copiedBoard);
                    return;
                } else {            
                    setCell(rowIndex + 1, 0);
                }
            } else {
                setCell(rowIndex, newCol)
            }
        }
    }
    // Recursively set all cells for all possible configurations
    setCell(0, 0);
    return validBoards;
}

function generateBoardPrint(b) {
    // Creates a unique stamp representing the board's information
    // Print is top count + bottom count + left count + right count
    // Then each row in the grid, top row is first, bottom row is last
    // Total of 32 digits, each with a value of 1-4
    var print = "";
    var nums = [0, 1, 2, 3];
    
    nums.forEach(function(num){print += getColumnCount(b, num, 1)});
    nums.forEach(function(num){print += getColumnCount(b, num, -1)});
    nums.forEach(function(num){print += getRowCount(b, num, 1)});
    nums.forEach(function(num){print += getRowCount(b, num, -1)});

    b.forEach(function(row) {
        row.forEach(function(cell) {
            print += cell;
        });
    });
    return print;
}

function uniqueKey(boardIndex) {
    // Creates a key from the boardPrint that uniquely identifies it from the other possible boards
    // This key is (indexInPrint->valueAtIndex)
    // All values in the key are the ones that will be shown as clues to the user
    var boardInfo = masterBoardList[boardIndex];
    var uniqueBoard = boardInfo.board;
    var boardPrint = boardInfo.boardPrint;

    console.assert(generateBoardPrint(uniqueBoard) === boardPrint, "Wrong board and boardPrint!");

    var labelIndices = [];
    var gridIndices = [];
    for (var i = 0; i < boardSize*4; i++) {
        labelIndices.push(i);
    }
    for (i = boardSize*4; i < boardSize*4+sizeSq; i++) {
        gridIndices.push(i);
    }
    shuffleArray(labelIndices);
    shuffleArray(gridIndices);

    var key = {};
    var firstHalfIndex = 0, lastHalfIndex = 0;
    var matchingIndices = getMatching(key); // will match with all the boards
    var firstHalf = 2; // Whether to grab from first or second half of print. Weighted in favor of first half (The number indicating visible towers)
    var countDown = 100000;
    while(matchingIndices.length > 1) {
        countDown-=1;
        if (countDown<0) {
            console.error("Could not produce a unique key");
            break;
        }
        var keyCopy = JSON.parse( JSON.stringify( key ) ); // heh. heh. heh. shoot me

        if (lastHalfIndex >= printLength || firstHalf > 0 && firstHalfIndex < boardSize*4) {
            firstHalf -= 1;
            firstHalfIndex += 1;
            keyCopy[labelIndices[firstHalfIndex]] = boardPrint[labelIndices[firstHalfIndex]];
        } else if(lastHalfIndex < printLength) {
            firstHalf = 2;
            lastHalfIndex += 1;
            keyCopy[gridIndices[lastHalfIndex]] = boardPrint[gridIndices[lastHalfIndex]];
        } else {
            console.error("Both index incrementers are out of bounds", firstHalfIndex, lastHalfIndex);
        }
        var newMatching = getMatching(keyCopy, matchingIndices);
        // If new addition to key helps differentiate, we keep it. Otherwise, we keep using the unmodified key
        if (newMatching.length < matchingIndices.length) {
            key = keyCopy;
            matchingIndices = newMatching;
        }
    }
    console.log(key);
    return key;
}

function getMatching(key, boardIndices) {
    // key is a dictionary of (stringIndex->value at index)
    var matching = [];
    function matchesPrint(print) {
        for (var stringIndex in key) {
            if (key.hasOwnProperty(stringIndex)) {
                if (print[stringIndex] !== key[stringIndex]) {
                    return false;
                }
            }
        }
        return true;
    }
    if (boardIndices) {
        boardIndices.forEach(function(i) {
            if (matchesPrint(masterBoardList[i].boardPrint)) {
                matching.push(i);
            }
        })
    } else {
        for (var i = 0; i < masterBoardList[i].length; i++) {
            if (matchesPrint(masterBoardList[i].boardPrint)) {
                matching.push(i);
            }
        }
    }
    return matching;
}

function getRowCount(board, row, direction) {
    var currentMax = 0,
        i =0,
        count=0;
    if (direction > 0) {
        for (i = 0; i < board[row].length; i++) {
            if (currentMax < board[row][i]) {
                count += 1;
                currentMax =  board[row][i];
            }
        }
    } else {
        for (i = board[row].length-1; i >= 0; i--) {
            if (currentMax < board[row][i]) {
                count += 1;
                currentMax =  board[row][i];
            }
        }
    }
    return count;
}
function getColumnCount(board, colIndex, direction) {
    var currentMax = 0,
        i = 0,
        count=0;
    if (direction > 0) {
        for (i = 0; i < board.length; i++) {
            if (currentMax < board[i][colIndex]) {
                count += 1;
                currentMax = board[i][colIndex];
            }
        }
    } else {
        for (i = board.length-1; i >= 0; i--) {
            if (currentMax < board[i][colIndex]) {
                count += 1;
                currentMax = board[i][colIndex];
            }
        }
    }
    return count;
}

function validate() {
    var hasError = false;
    $("#gameTable").find("tr").each(function(rowIndex) {
        // boardSize + 1 because two extra rows are included in the grid
        if (rowIndex === 0 || rowIndex === boardSize+1) {
            return;
        }

        var cells = $(this).find(".cell input");
        cells.each(function(colIndex) {
            if (parseInt($(this).val()) !== board[rowIndex-1][colIndex]) {
                hasError = true;
            }
        })
    });
    if (hasError) {
        alert("Nope! Try again")
    } else {
        alert("Correct!\nTime: " + timeElapsed());
        clearInterval(timer);
    }
}
var board; // keep this accessible in validate
function initBoard(boardIndex) {
    var boardInfo = masterBoardList[boardIndex];
    board = boardInfo[board];
    if (!boardInfo.uniqueKey) {
        boardInfo.uniqueKey = uniqueKey(boardIndex);
    }
    var boardKey = boardInfo.uniqueKey;
    var table = $("#gameTable");
    var label;
    table.empty();
    for (var i=0; i<boardSize+2; i++) {
        var row = $("<tr>");
        for (var j=0; j<boardSize+2; j++) {
            if (i === 0 || i === boardSize + 1) {
                if (j%boardSize === 0) {
                    row.append($("<td>"));
                } else {
                    row.append($("<td>").addClass("label"))
                }
            } else {
                if (j === 0 || j === boardSize + 1) {
                    row.append($("<td>").addClass("label"))
                } else {
                    row.append($("<td><input></td>").addClass("cell"))
                }
            }
        }
        table.append(row)
    }

    for (var stringIndex in boardKey) {
        if (boardKey.hasOwnProperty(stringIndex)) {
            var value = boardKey[stringIndex];
            stringIndex = parseInt(stringIndex); // The index of the value in the boardPrint string
            console.log(value, stringIndex);

            // nth-child starts at 1
            if (stringIndex < boardSize) {
                label = table.find("tr:first-child td:nth-child(" + (stringIndex+2) + ")");
                console.assert(label.length === 1);
                label.text(value);
            } else if (stringIndex < boardSize*2) {
                label = table.find("tr:last-child td:nth-child(" + (stringIndex - boardSize + 2) + ")");
                console.assert(label.length === 1);
                label.text(value);
            } else if (stringIndex < boardSize*3) {
                label = table.find("tr:nth-child(" + (stringIndex - boardSize*2 + 2) + ") .label:first-child");
                console.assert(label.length === 1);
                label.text(value);
            } else if (stringIndex < boardSize*4) {
                label = table.find("tr:nth-child(" + (stringIndex - boardSize*3 + 2) + ") .label:last-child");
                console.assert(label.length === 1);
                label.text(value);
            } else if (stringIndex < printLength) {
                stringIndex -= boardSize*4;
                var columnIndex = stringIndex%boardSize;
                var rowIndex = (stringIndex - columnIndex)/boardSize;
                var input = $("tr:nth-child(" + (rowIndex+2) + ") .cell:nth-child(" + (columnIndex+2) + ") input");
                console.assert(input.length === 1);
                input.val(value);
                input.attr("disabled", "true");
            } else {
                console.error("Invalid index in boardKey", stringIndex);
            }
        }
    }
}
function timeElapsed() {
    return Math.floor((Date.now() - startTime)/1000);
}

var startTime, timer;
var masterBoardList = [];
$.getJSON("http://localhost:8000/boards.json", {}, function(boardInfo) {
    if (boardInfo[boardSize]) {
        masterBoardList = boardInfo[boardSize]
    } else {
        var generatedBoards = generateBoards();
        generatedBoards.forEach(function(b) {
            masterBoardList.push({
                board: b,
                boardPrint: generateBoardPrint(b)
            })
        });
    }
    $(document).ready(function() {
        var randIndex = Math.floor(Math.random() * (masterBoardList.length));
        initBoard(randIndex);
        function beginTimer() {
            startTime = Date.now();
            function updateText() {
                $("#clock").text(timeElapsed())
            }
            timer = setInterval(updateText, 1000);
            updateText();
        }
        beginTimer();
        $("#restart").click(function() {
            clearInterval(timer);
            beginTimer();
            var randIndex = Math.floor(Math.random() * (masterBoardList.length));
            initBoard(randIndex);
        })
    });
});
