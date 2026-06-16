const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = Array.from(new Set(["ts", "tsx", "js", "jsx", "json", ...config.resolver.sourceExts]));
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith(".js") && moduleName.startsWith("./")) {
    const tsName = moduleName.replace(/\.js$/, ".ts");
    try {
      return context.resolveRequest(context, tsName, platform);
    } catch {
      return context.resolveRequest(context, moduleName, platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
