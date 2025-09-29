import { DexPlugin, createOneInchPlugin } from './1inch/index';

// Plugin Registry to manage all DEX plugins
export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, DexPlugin> = new Map();
  private defaultPlugin: string = '1inch';

  private constructor() {
    // Initialize default plugins
    this.registerPlugin(createOneInchPlugin());
  }

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  registerPlugin(plugin: DexPlugin): void {
    this.plugins.set(plugin.name.toLowerCase(), plugin);
  }

  getPlugin(name?: string): DexPlugin | undefined {
    const pluginName = name?.toLowerCase() || this.defaultPlugin;
    return this.plugins.get(pluginName);
  }

  getAllPlugins(): DexPlugin[] {
    return Array.from(this.plugins.values());
  }

  getAvailableProtocols(): string[] {
    return Array.from(this.plugins.keys());
  }

  setDefaultPlugin(name: string): void {
    if (this.plugins.has(name.toLowerCase())) {
      this.defaultPlugin = name.toLowerCase();
    }
  }

  // Helper method to find best plugin for a chain
  getPluginForChain(chainId: number, preferredPlugin?: string): DexPlugin | undefined {
    // First try preferred plugin if specified
    if (preferredPlugin) {
      const plugin = this.getPlugin(preferredPlugin);
      if (plugin && plugin.supportedChains.includes(chainId)) {
        return plugin;
      }
    }

    // Then try default plugin
    const defaultPlugin = this.getPlugin();
    if (defaultPlugin && defaultPlugin.supportedChains.includes(chainId)) {
      return defaultPlugin;
    }

    // Finally, find any plugin that supports this chain
    for (const plugin of this.plugins.values()) {
      if (plugin.supportedChains.includes(chainId)) {
        return plugin;
      }
    }

    return undefined;
  }

  // Get all commands from all plugins merged together
  getAllCommands(context: any): { [key: string]: any } {
    const allCommands: { [key: string]: any } = {};

    for (const plugin of this.plugins.values()) {
      const commands = plugin.getCommands();
      for (const command of commands) {
        // Create a wrapper that calls the plugin's executeCommand with captured context
        allCommands[command.name] = async (args: string[]) => {
          await plugin.executeCommand(command.name, args, context);
        };
      }
    }

    return allCommands;
  }
}

// Export singleton instance
export const pluginRegistry = PluginRegistry.getInstance();