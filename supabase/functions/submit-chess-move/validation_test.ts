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

Deno.test("requires an explicit promotion piece in stored UCI history", () => {
  assert.throws(
    () => validateAndApplyChessMove(["a7a8"], "e2e4", "w"),
    (error: unknown) => error instanceof ChessMoveValidationError && error.status === 409,
  );
});
