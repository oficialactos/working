const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = ["react-native", "browser", "module", "main"];
config.resolver.extraNodeModules = {
  punycode: path.resolve(__dirname, "node_modules/punycode/punycode.js"),
  ws: path.resolve(__dirname, "shims/ws.js")
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    return context.resolveRequest(
      context,
      path.resolve(__dirname, moduleName.slice(2)),
      platform
    );
  }

  if (moduleName === "punycode") {
    return {
      filePath: path.resolve(__dirname, "node_modules/punycode/punycode.js"),
      type: "sourceFile"
    };
  }

  if (moduleName === "ws") {
    return {
      filePath: path.resolve(__dirname, "shims/ws.js"),
      type: "sourceFile"
    };
  }

  if (moduleName === "lucide-react-native") {
    return {
      filePath: path.resolve(__dirname, "node_modules/lucide-react-native/dist/cjs/lucide-react-native.js"),
      type: "sourceFile"
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
