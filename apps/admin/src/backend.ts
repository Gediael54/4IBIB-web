import { createBackend as createRuntimeBackend } from "@4ibib/runtime";

export function createBackend() {
  return createRuntimeBackend(import.meta.env);
}
