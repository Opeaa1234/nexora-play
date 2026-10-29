import { Chess } from "npm:chess.js@1.4.0";

export class ChessMoveValidationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ChessMoveValidationError";
    this.status = status;
  }
}

const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function validateAndApplyChessMove(
  history: unknown,
  rawMove: string,
  expectedColor?: "w" | "b",
) {
  if (!Array.isArray(history)) {
    throw new ChessMoveValidationError(409, "The saved chess history is malformed.");
  }

  const game = new Chess();
  try {
    for (const raw of history) {
      if (typeof raw !== "string" || !UCI_MOVE.test(raw)) {
        throw new ChessMoveValidationError(409, "The saved chess history is malformed.");
      }
      const replayed = game.move({
        from: raw.slice(0, 2),
        to: raw.slice(2, 4),
        ...(raw[4] ? { promotion: raw[4] } : {}),
      });
      if (!replayed || replayed.from + replayed.to + (replayed.promotion || "") !== raw) {
        throw new ChessMoveValidationError(409, "The saved chess history contains an illegal move.");
      }
    }
  } catch (error) {
    if (error instanceof ChessMoveValidationError) throw error;
    throw new ChessMoveValidationError(409, "The saved chess history cannot be replayed.");
  }

  if (game.isGameOver()) {
    throw new ChessMoveValidationError(409, "This chess game has already ended.");
  }
  if (expectedColor && game.turn() !== expectedColor) {
    throw new ChessMoveValidationError(403, "It is not your turn.");
  }
  if (typeof rawMove !== "string" || !UCI_MOVE.test(rawMove)) {
    throw new ChessMoveValidationError(400, "Invalid move format.");
  }

  let played;
  try {
    played = game.move({
      from: rawMove.slice(0, 2),
      to: rawMove.slice(2, 4),
      ...(rawMove[4] ? { promotion: rawMove[4] } : {}),
    });
  } catch {
    throw new ChessMoveValidationError(400, "That is not a legal chess move.");
  }
  if (!played || played.from + played.to + (played.promotion || "") !== rawMove) {
    throw new ChessMoveValidationError(400, "That is not a legal chess move. Include a promotion piece when required.");
  }

  const nextMoves = [...history, rawMove];
  const ended = game.isGameOver();
  const result = game.isCheckmate()
    ? (game.turn() === "w" ? "0-1" : "1-0")
    : game.isDraw()
    ? "1/2-1/2"
    : null;

  return {
    nextMoves,
    status: ended ? "finished" as const : "playing" as const,
    result,
  };
}
