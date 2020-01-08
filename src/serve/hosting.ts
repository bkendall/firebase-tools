import clc = require("cli-color");
import { FirebaseError } from "../error";
import * as utils from "../utils";
import * as detectProjectRoot from "../detectProjectRoot";
import functionsProxy from "../hosting/functionsProxy";
import cloudRunProxy from "../hosting/cloudRunProxy";
const superstatic = require("superstatic").server;
import initMiddleware = require("../hosting/initMiddleware");
import normalizedHostingConfigs = require("../hosting/normalizedHostingConfigs");
import { implicitInit, TemplateServerResponce } from "../hosting/implicitInit";

const MAX_PORT_ATTEMPTS = 10;
let _attempts = 0;
let server: any;

function _startServer(options: any, config: any, port: number, init: TemplateServerResponce): void {
  server = superstatic({
    debug: true,
    port: port,
    host: options.host,
    config: config,
    cwd: detectProjectRoot(options.cwd),
    stack: "strict",
    before: {
      files: initMiddleware(init),
    },
    rewriters: {
      function: functionsProxy(options),
      run: cloudRunProxy(options),
    },
  }).listen(function() {
    const siteName = config.target || config.site;
    const label = siteName ? "hosting[" + siteName + "]" : "hosting";

    if (config.public && config.public !== ".") {
      utils.logLabeledBullet(label, "Serving hosting files from: " + clc.bold(config.public));
    }
    utils.logLabeledSuccess(
      label,
      "Local server: " + clc.underline(clc.bold("http://" + options.host + ":" + port))
    );
  });

  server.on("error", function(err: any) {
    if (err.code === "EADDRINUSE") {
      const message = "Port " + options.port + " is not available.";
      if (_attempts < MAX_PORT_ATTEMPTS) {
        utils.logWarning(clc.yellow("hosting: ") + message + " Trying another port...");
        // Another project that's running takes up to 4 ports: 1 hosting port and 3 functions ports
        _attempts++;
        _startServer(options, config, port + 5, init);
      } else {
        utils.logWarning(message);
        throw new FirebaseError("Could not find an open port for hosting development server.", {
          exit: 1,
        });
      }
    } else {
      throw new FirebaseError(
        "An error occurred while starting the hosting development server:\n\n" + err.toString(),
        { exit: 1 }
      );
    }
  });
}

export function stop(): Promise<void> {
  if (server) {
    server.close();
  }
  return Promise.resolve();
}

export function start(options: any): Promise<void> {
  return implicitInit(options).then(function(init: TemplateServerResponce) {
    const configs = normalizedHostingConfigs(options);

    for (let i = 0; i < configs.length; i++) {
      // skip over the functions emulator ports to avoid breaking changes
      const port = i === 0 ? options.port : options.port + 4 + i;
      _startServer(options, configs[i], port, init);
    }
  });
}

export function connect(): Promise<void> {
  return Promise.resolve();
}
