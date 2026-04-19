/**
 * Simple Test Extension - Tests basic extension loading
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function simpleTestExtension(pi: ExtensionAPI) {
  // React to session events
  pi.on("session_start", async (event, ctx) => {
    console.log(`Simple extension loaded: ${event.reason}`);
  });

  // Register a command
  pi.registerCommand("simple", {
    description: "Simple test command",
    handler: async (args, ctx) => {
      console.log(`Simple command called with: ${args}`);
    }
  });

  // Register a flag
  pi.registerFlag("simple-mode", {
    description: "Enable simple test mode",
    type: "boolean",
    default: false
  });

  // Check if our flag is enabled
  if (pi.getFlag("--simple-mode")) {
    console.log("Simple mode is enabled!");
  }
}