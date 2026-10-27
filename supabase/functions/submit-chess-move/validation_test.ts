import { strict as assert } from "node:assert";
import {
  ChessMoveValidationError,
  validateAndApplyChessMove,
} from "./validation.ts";

Deno.test("accepts a legal opening move", () => {
  const result = validateAndApplyChessMove([], "e2e4", "w");
  assert.deepEqual(result.nextMoves, ["e2e4"]);
  assert.equal(result.status, "playing");
  assert.equal(result.result, null);
});

Deno.test("rejects an illegal move", () => {
  assert.throws(
    () => validateAndApplyChessMove([], "e2e5", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 400,
  );
});

Deno.test("rejects a move from the wrong side", () => {
  assert.throws(
    () => validateAndApplyChessMove([], "e7e5", "b"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 403,
  );
});

Deno.test("rejects malformed or illegal stored history", () => {
  assert.throws(
    () => validateAndApplyChessMove(["not-a-move"], "e2e4", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 409,
  );
  assert.throws(
    () => validateAndApplyChessMove(["e2e5"], "e2e4", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 409,
  );
});

Deno.test("detects checkmate and rejects moves after the game ends", () => {
  const history = ["f2f3", "e7e5", "g2g4"];
  const result = validateAndApplyChessMove(history, "d8h4", "b");
  assert.deepEqual(result.nextMoves, [...history, "d8h4"]);
  assert.equal(result.status, "finished");
  assert.equal(result.result, "0-1");
  assert.throws(
    () => validateAndApplyChessMove(result.nextMoves, "e2e4", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 409,
  );
});

Deno.test("rejects illegal moves in stored history", () => {
  assert.throws(
    () => validateAndApplyChessMove(["a7a8"], "e2e4", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 409,
  );
});

Deno.test("rejects non-array saved history", () => {
  assert.throws(
    () => validateAndApplyChessMove(null, "e2e4", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 409,
  );
});

Deno.test("rejects malformed UCI input", () => {
  assert.throws(
    () => validateAndApplyChessMove([], "e2-e4", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 400,
  );
});

Deno.test("requires an explicit promotion piece and preserves the chosen piece", () => {
  const history = [
    "a2a4", "b7b5", "a4b5", "h7h6",
    "b5b6", "b8c6", "b6b7", "h6h5",
  ];
  assert.throws(
    () => validateAndApplyChessMove(history, "b7b8", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 400,
  );
  const promoted = validateAndApplyChessMove(history, "b7b8n", "w");
  assert.equal(promoted.nextMoves.at(-1), "b7b8n");
  assert.equal(promoted.status, "playing");
});

Deno.test("detects a threefold-repetition draw", () => {
  const history = [
    "g1f3", "g8f6", "f3g1", "f6g8",
    "g1f3", "g8f6", "f3g1", "f6g8",
  ];
  const result = validateAndApplyChessMove(history.slice(0, 7), "f6g8", "b");
  assert.deepEqual(result.nextMoves, history);
  assert.equal(result.status, "finished");
  assert.equal(result.result, "1/2-1/2");
});
