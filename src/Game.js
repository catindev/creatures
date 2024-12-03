import React, { useState, useCallback, useEffect } from "react";
import { useTelegram } from "./useTelegram.js";
import "./Game.css";

const INITIAL_BOARD = [
  ["x", "x", 1, 1, 1, "x", "x"],
  ["x", "x", 1, 1, 1, "x", "x"],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  ["x", "x", 1, 1, 1, "x", "x"],
  ["x", "x", 1, 1, 1, "x", "x"],
];

const DIRECTIONS = [
  { dx: -2, dy: 0 }, // Влево
  { dx: 2, dy: 0 }, // Вправо
  { dx: 0, dy: -2 }, // Вверх
  { dx: 0, dy: 2 }, // Вниз
];

function Game() {
  // Загрузка последнего состояния игры из localStorage
  const getInitialBoard = () => {
    const savedGame = localStorage.getItem("TheCreatures");
    return savedGame
      ? JSON.parse(savedGame)
      : INITIAL_BOARD.map((row) => [...row]);
  };

  const [board, setBoard] = useState(getInitialBoard());
  const [selected, setSelected] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [creatures, setCreatures] = useState(() =>
    INITIAL_BOARD.map((row) =>
      row.map((cell) =>
        cell === 1 ? Math.floor(Math.random() * 32) + 1 : null
      )
    )
  );
  const { tg, user } = useTelegram();

  // Сохранение состояния игры при каждом изменении
  useEffect(() => {
    localStorage.setItem("TheCreatures", JSON.stringify(board));

    if (tg && user) {
      tg.setHeaderColor("red");
      tg.setBackgroundColor("#42424C");
      tg.expand();
      tg.disableVerticalSwipes();
      tg.requestFullscreen();
      tg.lockOrientation();
      // login(user, tg);
    }
  }, [board, tg, user]);

  useEffect(() => {
    if (tg && user) {
      tg.setHeaderColor("#BC5651");
      tg.setBackgroundColor("#42424C");
      tg.expand();
      tg.disableVerticalSwipes();
      tg.requestFullscreen();
      tg.lockOrientation();
      // login(user, tg);
    }
  }, [tg, user]);

  // Сохранение истории ходов
  const saveMove = useCallback(
    (x1, y1, x2, y2) => {
      const newMoveHistory = [
        ...moveHistory,
        { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } },
      ];
      setMoveHistory(newMoveHistory);
      localStorage.setItem("TheCreaturesMoves", JSON.stringify(newMoveHistory));
    },
    [moveHistory]
  );

  // Обработчик сброса игры
  const handleNewGame = useCallback(() => {
    setBoard(INITIAL_BOARD.map((row) => [...row]));
    setCreatures(
      INITIAL_BOARD.map((row) =>
        row.map((cell) =>
          cell === 1 ? Math.floor(Math.random() * 32) + 1 : null
        )
      )
    );
    setSelected(null);
    setPossibleMoves([]);
    setMoveHistory([]);
    localStorage.removeItem("TheCreatures");
    localStorage.removeItem("TheCreaturesMoves");
  }, []);

  const isWithinBounds = useCallback(
    (x, y) => x >= 0 && x < board[0].length && y >= 0 && y < board.length,
    [board]
  );

  const isValidMove = useCallback(
    (x1, y1, x2, y2) => {
      if (!isWithinBounds(x2, y2)) return false;
      if (board[y2][x2] !== 0) return false;

      const dx = Math.abs(x1 - x2);
      const dy = Math.abs(y1 - y2);

      if ((dx === 2 && dy === 0) || (dx === 0 && dy === 2)) {
        const middleX = (x1 + x2) / 2;
        const middleY = (y1 + y2) / 2;

        if (isWithinBounds(middleX, middleY)) {
          return board[middleY][middleX] === 1;
        }
      }
      return false;
    },
    [board, isWithinBounds]
  );

  const getValidMoves = useCallback(
    (x, y) => {
      return DIRECTIONS.map((direction) => ({
        x: x + direction.dx,
        y: y + direction.dy,
      })).filter(({ x: targetX, y: targetY }) =>
        isValidMove(x, y, targetX, targetY)
      );
    },
    [isValidMove]
  );

  const checkGameOver = useCallback(() => {
    // Проверка, есть ли возможные ходы у любой фишки
    const hasValidMoves = board.some((row, y) =>
      row.some((cell, x) => cell === 1 && getValidMoves(x, y).length > 0)
    );

    setIsGameOver(!hasValidMoves);
  }, [board, getValidMoves]);

  // Вызывать после каждого хода
  useEffect(() => {
    checkGameOver();
  }, [board, checkGameOver]);

  const movePiece = useCallback(
    (x1, y1, x2, y2) => {
      const newBoard = board.map((row) => [...row]);
      const newCreatures = creatures.map((row) => [...row]);

      const middleX = (x1 + x2) / 2;
      const middleY = (y1 + y2) / 2;

      newBoard[y1][x1] = 0;
      newBoard[middleY][middleX] = 0;
      newBoard[y2][x2] = 1;

      // Перемещаем существ
      newCreatures[y2][x2] = newCreatures[y1][x1];
      newCreatures[y1][x1] = null;
      newCreatures[middleY][middleX] = null;

      saveMove(x1, y1, x2, y2);
      setBoard(newBoard);
      setCreatures(newCreatures);
    },
    [board, creatures, saveMove]
  );

  const handleCellClick = useCallback(
    (x, y) => {
      if (isGameOver) return;

      // Если выбрана другая фишка, автоматически сменить выделение
      if (
        selected &&
        board[y][x] === 1 &&
        (selected.x !== x || selected.y !== y)
      ) {
        setSelected({ x, y });
        setPossibleMoves(getValidMoves(x, y));
        return;
      }

      if (selected) {
        if (isValidMove(selected.x, selected.y, x, y)) {
          movePiece(selected.x, selected.y, x, y);
          setSelected(null);
          setPossibleMoves([]);
        } else {
          setSelected(null);
          setPossibleMoves([]);
        }
      } else if (board[y][x] === 1) {
        setSelected({ x, y });
        setPossibleMoves(getValidMoves(x, y));
      }
    },
    [board, selected, isValidMove, movePiece, getValidMoves, isGameOver]
  );

  const renderCell = useCallback(
    (cell, x, y) => {
      let className = "cell";
      let style = {};
      let creatureImage = null;

      if (cell === "x") {
        className += " invalid";
      } else if (cell === 0) {
        className += " empty";
      } else if (cell === 1) {
        const creatureId = creatures[y][x];
        creatureImage = (
          <img
            src={`/assets/creatures/c${creatureId}.svg`}
            alt={`Creature ${creatureId}`}
            className="creature-image"
          />
        );
      }

      if (selected && selected.x === x && selected.y === y) {
        style.background = "rgba(var(--dark-light),1)";
        style.borderColor = "rgba(var(--light),1)";
        style.color = "rgba(var(--light),1)";
      }

      if (possibleMoves.some((move) => move.x === x && move.y === y)) {
        style.borderColor = "rgba(var(--active),1)";
      }

      return (
        <div
          key={`${x}-${y}`}
          className={className}
          style={style}
          onClick={() => handleCellClick(x, y)}
        >
          {creatureImage}
        </div>
      );
    },
    [selected, possibleMoves, handleCellClick]
  );

  const remaining = board.flat().filter((cell) => cell === 1).length;

  return (
    <div className="Game">
      <div className="header">
        <div className="logotype"></div>
        <div className="remaining">
          {isGameOver && (
            <img src={"/assets/digits_danger/" + remaining + ".svg"} />
          )}
          {!isGameOver && <img src={"/assets/digits/" + remaining + ".svg"} />}
        </div>
      </div>
      <div className="board">
        {board.map((row, y) => row.map((cell, x) => renderCell(cell, x, y)))}
      </div>

      <div className="footer">
        <div className="NewGameButtton" onClick={handleNewGame}></div>
      </div>
    </div>
  );
}

export default Game;
