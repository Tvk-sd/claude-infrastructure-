/**
 * Test Extension - Demonstrates basic extension functionality
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function testExtension(pi: ExtensionAPI) {
  // React to session start
  pi.on("session_start", async (event, ctx) => {
    ctx.ui.notify(`Test extension loaded! (reason: ${event.reason})`, "info");
    ctx.ui.setStatus("test-ext", "Ready");
  });

  // Register a simple tool
  pi.registerTool({
    name: "test_greet",
    label: "Test Greet",
    description: "A test greeting tool that demonstrates custom tools",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
      style: Type.Optional(Type.Union([
        Type.Literal("formal"),
        Type.Literal("casual"),
        Type.Literal("excited")
      ], { description: "Greeting style" }))
    }),
    
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      // Show progress
      onUpdate?.({ 
        content: [{ type: "text", text: "Preparing greeting..." }] 
      });
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const style = params.style || "casual";
      let greeting;
      
      switch (style) {
        case "formal":
          greeting = `Good day, ${params.name}. I hope this message finds you well.`;
          break;
        case "excited":
          greeting = `Hey there ${params.name}! 🎉 Great to meet you!`;
          break;
        default:
          greeting = `Hello, ${params.name}!`;
      }
      
      return {
        content: [{ type: "text", text: greeting }],
        details: { 
          greeted: params.name, 
          style,
          timestamp: new Date().toISOString() 
        }
      };
    }
  });

  // Register a command
  pi.registerCommand("test", {
    description: "Test extension command with various actions",
    getArgumentCompletions: (prefix) => {
      const actions = ["status", "tools", "notify", "reset"];
      const filtered = actions.filter(a => a.startsWith(prefix));
      return filtered.length > 0 ? filtered.map(a => ({ value: a, label: a })) : null;
    },
    
    handler: async (args, ctx) => {
      const action = args.trim() || "status";
      
      switch (action) {
        case "status":
          const entries = ctx.sessionManager.getEntries().length;
          const leafId = ctx.sessionManager.getLeafId();
          ctx.ui.notify(`Session has ${entries} entries. Current leaf: ${leafId?.slice(-8) || "none"}`, "info");
          break;
          
        case "tools":
          const activeTools = pi.getActiveTools();
          const allTools = pi.getAllTools();
          ctx.ui.notify(`Active tools: ${activeTools.length}/${allTools.length}`, "info");
          break;
          
        case "notify":
          ctx.ui.notify("Test notification from extension!", "success");
          break;
          
        case "reset":
          ctx.ui.setStatus("test-ext", "Reset");
          setTimeout(() => {
            ctx.ui.setStatus("test-ext", "Ready");
          }, 2000);
          break;
          
        default:
          ctx.ui.notify(`Unknown action: ${action}`, "error");
      }
    }
  });

  // Register a keyboard shortcut
  pi.registerShortcut("ctrl+shift+t", {
    description: "Test extension shortcut",
    handler: async (ctx) => {
      ctx.ui.notify("Test extension shortcut activated!", "info");
    }
  });

  // Listen for tool calls to demonstrate interception
  pi.on("tool_call", async (event, ctx) => {
    // Log all tool calls from this extension
    if (event.toolName === "test_greet") {
      console.log(`Test extension: greet tool called with name="${event.input.name}"`);
    }
  });

  // Clean up on shutdown
  pi.on("session_shutdown", async (_event, ctx) => {
    console.log("Test extension shutting down...");
  });
}