import { connection } from "next/server";

/** Opt this render into request time so data/db.json is read live. */
export async function live() {
  await connection();
}
