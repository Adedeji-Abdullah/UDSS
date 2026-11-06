"use strict";
var UDSSPasskeys = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // node_modules/@simplewebauthn/browser/script/helpers/bufferToBase64URLString.js
  var require_bufferToBase64URLString = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/bufferToBase64URLString.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.bufferToBase64URLString = bufferToBase64URLString;
      function bufferToBase64URLString(buffer) {
        const bytes = new Uint8Array(buffer);
        let str = "";
        for (const charCode of bytes) {
          str += String.fromCharCode(charCode);
        }
        const base64String = btoa(str);
        return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/base64URLStringToBuffer.js
  var require_base64URLStringToBuffer = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/base64URLStringToBuffer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.base64URLStringToBuffer = base64URLStringToBuffer;
      function base64URLStringToBuffer(base64URLString) {
        const base64 = base64URLString.replace(/-/g, "+").replace(/_/g, "/");
        const padLength = (4 - base64.length % 4) % 4;
        const padded = base64.padEnd(base64.length + padLength, "=");
        const binary = atob(padded);
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return buffer;
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/browserSupportsWebAuthn.js
  var require_browserSupportsWebAuthn = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/browserSupportsWebAuthn.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports._browserSupportsWebAuthnInternals = void 0;
      exports.browserSupportsWebAuthn = browserSupportsWebAuthn;
      function browserSupportsWebAuthn() {
        return exports._browserSupportsWebAuthnInternals.stubThis(globalThis?.PublicKeyCredential !== void 0 && typeof globalThis.PublicKeyCredential === "function");
      }
      exports._browserSupportsWebAuthnInternals = {
        stubThis: (value) => value
      };
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/toPublicKeyCredentialDescriptor.js
  var require_toPublicKeyCredentialDescriptor = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/toPublicKeyCredentialDescriptor.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.toPublicKeyCredentialDescriptor = toPublicKeyCredentialDescriptor;
      var base64URLStringToBuffer_js_1 = require_base64URLStringToBuffer();
      function toPublicKeyCredentialDescriptor(descriptor) {
        const { id } = descriptor;
        return {
          ...descriptor,
          id: (0, base64URLStringToBuffer_js_1.base64URLStringToBuffer)(id),
          transports: descriptor.transports,
          type: descriptor.type
        };
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/isValidDomain.js
  var require_isValidDomain = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/isValidDomain.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.isValidDomain = isValidDomain;
      function isValidDomain(hostname) {
        return (
          // Consider localhost valid as well since it's okay wrt Secure Contexts
          hostname === "localhost" || // Support punycode (ACE) or ascii labels and domains
          /^((xn--[a-z0-9-]+|[a-z0-9]+(-[a-z0-9]+)*)\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(hostname)
        );
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/webAuthnError.js
  var require_webAuthnError = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/webAuthnError.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.WebAuthnError = void 0;
      var WebAuthnError = class extends Error {
        constructor({ message, code, cause, name }) {
          super(message, { cause });
          Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
          });
          this.name = name ?? cause.name;
          this.code = code;
        }
      };
      exports.WebAuthnError = WebAuthnError;
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/identifyRegistrationError.js
  var require_identifyRegistrationError = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/identifyRegistrationError.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.identifyRegistrationError = identifyRegistrationError;
      var isValidDomain_js_1 = require_isValidDomain();
      var webAuthnError_js_1 = require_webAuthnError();
      function identifyRegistrationError({ error, options }) {
        const { publicKey } = options;
        if (!publicKey) {
          throw Error("options was missing required publicKey property");
        }
        if (error.name === "AbortError") {
          if (options.signal instanceof AbortSignal) {
            return new webAuthnError_js_1.WebAuthnError({
              message: "Registration ceremony was sent an abort signal",
              code: "ERROR_CEREMONY_ABORTED",
              cause: error
            });
          }
        } else if (error.name === "ConstraintError") {
          if (publicKey.authenticatorSelection?.requireResidentKey === true) {
            return new webAuthnError_js_1.WebAuthnError({
              message: "Discoverable credentials were required but no available authenticator supported it",
              code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
              cause: error
            });
          } else if (
            // @ts-ignore: `mediation` doesn't yet exist on CredentialCreationOptions but it's possible as of Sept 2024
            options.mediation === "conditional" && publicKey.authenticatorSelection?.userVerification === "required"
          ) {
            return new webAuthnError_js_1.WebAuthnError({
              message: "User verification was required during automatic registration but it could not be performed",
              code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE",
              cause: error
            });
          } else if (publicKey.authenticatorSelection?.userVerification === "required") {
            return new webAuthnError_js_1.WebAuthnError({
              message: "User verification was required but no available authenticator supported it",
              code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT",
              cause: error
            });
          }
        } else if (error.name === "InvalidStateError") {
          return new webAuthnError_js_1.WebAuthnError({
            message: "The authenticator was previously registered",
            code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
            cause: error
          });
        } else if (error.name === "NotAllowedError") {
          return new webAuthnError_js_1.WebAuthnError({
            message: error.message,
            code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
            cause: error
          });
        } else if (error.name === "NotSupportedError") {
          const validPubKeyCredParams = publicKey.pubKeyCredParams.filter((param) => param.type === "public-key");
          if (validPubKeyCredParams.length === 0) {
            return new webAuthnError_js_1.WebAuthnError({
              message: 'No entry in pubKeyCredParams was of type "public-key"',
              code: "ERROR_MALFORMED_PUBKEYCREDPARAMS",
              cause: error
            });
          }
          return new webAuthnError_js_1.WebAuthnError({
            message: "No available authenticator supported any of the specified pubKeyCredParams algorithms",
            code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG",
            cause: error
          });
        } else if (error.name === "SecurityError") {
          const effectiveDomain = globalThis.location.hostname;
          if (!(0, isValidDomain_js_1.isValidDomain)(effectiveDomain)) {
            return new webAuthnError_js_1.WebAuthnError({
              message: `${globalThis.location.hostname} is an invalid domain`,
              code: "ERROR_INVALID_DOMAIN",
              cause: error
            });
          } else if (publicKey.rp.id !== effectiveDomain) {
            return new webAuthnError_js_1.WebAuthnError({
              message: `The RP ID "${publicKey.rp.id}" is invalid for this domain`,
              code: "ERROR_INVALID_RP_ID",
              cause: error
            });
          }
        } else if (error.name === "TypeError") {
          if (publicKey.user.id.byteLength < 1 || publicKey.user.id.byteLength > 64) {
            return new webAuthnError_js_1.WebAuthnError({
              message: "User ID was not between 1 and 64 characters",
              code: "ERROR_INVALID_USER_ID_LENGTH",
              cause: error
            });
          }
        } else if (error.name === "UnknownError") {
          return new webAuthnError_js_1.WebAuthnError({
            message: "The authenticator was unable to process the specified options, or could not create a new credential",
            code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
            cause: error
          });
        }
        return error;
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/webAuthnAbortService.js
  var require_webAuthnAbortService = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/webAuthnAbortService.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.WebAuthnAbortService = void 0;
      var BaseWebAuthnAbortService = class {
        constructor() {
          Object.defineProperty(this, "controller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
          });
        }
        createNewAbortSignal() {
          if (this.controller) {
            const abortError = new Error("Cancelling existing WebAuthn API call for new one");
            abortError.name = "AbortError";
            this.controller.abort(abortError);
          }
          const newController = new AbortController();
          this.controller = newController;
          return newController.signal;
        }
        cancelCeremony() {
          if (this.controller) {
            const abortError = new Error("Manually cancelling existing WebAuthn API call");
            abortError.name = "AbortError";
            this.controller.abort(abortError);
            this.controller = void 0;
          }
        }
      };
      exports.WebAuthnAbortService = new BaseWebAuthnAbortService();
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/toAuthenticatorAttachment.js
  var require_toAuthenticatorAttachment = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/toAuthenticatorAttachment.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.toAuthenticatorAttachment = toAuthenticatorAttachment;
      var attachments = ["cross-platform", "platform"];
      function toAuthenticatorAttachment(attachment) {
        if (!attachment) {
          return;
        }
        if (attachments.indexOf(attachment) < 0) {
          return;
        }
        return attachment;
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/methods/startRegistration.js
  var require_startRegistration = __commonJS({
    "node_modules/@simplewebauthn/browser/script/methods/startRegistration.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.startRegistration = startRegistration;
      var bufferToBase64URLString_js_1 = require_bufferToBase64URLString();
      var base64URLStringToBuffer_js_1 = require_base64URLStringToBuffer();
      var browserSupportsWebAuthn_js_1 = require_browserSupportsWebAuthn();
      var toPublicKeyCredentialDescriptor_js_1 = require_toPublicKeyCredentialDescriptor();
      var identifyRegistrationError_js_1 = require_identifyRegistrationError();
      var webAuthnAbortService_js_1 = require_webAuthnAbortService();
      var toAuthenticatorAttachment_js_1 = require_toAuthenticatorAttachment();
      async function startRegistration(options) {
        if (!options.optionsJSON && options.challenge) {
          console.warn("startRegistration() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.");
          options = { optionsJSON: options };
        }
        const { optionsJSON, useAutoRegister = false } = options;
        if (!(0, browserSupportsWebAuthn_js_1.browserSupportsWebAuthn)()) {
          throw new Error("WebAuthn is not supported in this browser");
        }
        const publicKey = {
          ...optionsJSON,
          challenge: (0, base64URLStringToBuffer_js_1.base64URLStringToBuffer)(optionsJSON.challenge),
          user: {
            ...optionsJSON.user,
            id: (0, base64URLStringToBuffer_js_1.base64URLStringToBuffer)(optionsJSON.user.id)
          },
          excludeCredentials: optionsJSON.excludeCredentials?.map(toPublicKeyCredentialDescriptor_js_1.toPublicKeyCredentialDescriptor)
        };
        const createOptions = {};
        if (useAutoRegister) {
          createOptions.mediation = "conditional";
        }
        createOptions.publicKey = publicKey;
        createOptions.signal = webAuthnAbortService_js_1.WebAuthnAbortService.createNewAbortSignal();
        let credential;
        try {
          credential = await navigator.credentials.create(
            // TODO: Newer versions of Deno require this casting, revisit once we're using Deno 2.6+
            createOptions
          );
        } catch (err) {
          throw (0, identifyRegistrationError_js_1.identifyRegistrationError)({ error: err, options: createOptions });
        }
        if (!credential) {
          throw new Error("Registration was not completed");
        }
        const { id, rawId, response, type } = credential;
        let transports = void 0;
        if (typeof response.getTransports === "function") {
          transports = response.getTransports();
        }
        let responsePublicKeyAlgorithm = void 0;
        if (typeof response.getPublicKeyAlgorithm === "function") {
          try {
            responsePublicKeyAlgorithm = response.getPublicKeyAlgorithm();
          } catch (error) {
            warnOnBrokenImplementation("getPublicKeyAlgorithm()", error);
          }
        }
        let responsePublicKey = void 0;
        if (typeof response.getPublicKey === "function") {
          try {
            const _publicKey = response.getPublicKey();
            if (_publicKey !== null) {
              responsePublicKey = (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(_publicKey);
            }
          } catch (error) {
            warnOnBrokenImplementation("getPublicKey()", error);
          }
        }
        let responseAuthenticatorData;
        if (typeof response.getAuthenticatorData === "function") {
          try {
            responseAuthenticatorData = (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(response.getAuthenticatorData());
          } catch (error) {
            warnOnBrokenImplementation("getAuthenticatorData()", error);
          }
        }
        return {
          id,
          rawId: (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(rawId),
          response: {
            attestationObject: (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(response.attestationObject),
            clientDataJSON: (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(response.clientDataJSON),
            transports,
            publicKeyAlgorithm: responsePublicKeyAlgorithm,
            publicKey: responsePublicKey,
            authenticatorData: responseAuthenticatorData
          },
          type,
          clientExtensionResults: credential.getClientExtensionResults(),
          authenticatorAttachment: (0, toAuthenticatorAttachment_js_1.toAuthenticatorAttachment)(credential.authenticatorAttachment)
        };
      }
      function warnOnBrokenImplementation(methodName, cause) {
        console.warn(`The browser extension that intercepted this WebAuthn API call incorrectly implemented ${methodName}. You should report this error to them.
`, cause);
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/browserSupportsWebAuthnAutofill.js
  var require_browserSupportsWebAuthnAutofill = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/browserSupportsWebAuthnAutofill.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports._browserSupportsWebAuthnAutofillInternals = void 0;
      exports.browserSupportsWebAuthnAutofill = browserSupportsWebAuthnAutofill;
      var browserSupportsWebAuthn_js_1 = require_browserSupportsWebAuthn();
      function browserSupportsWebAuthnAutofill() {
        if (!(0, browserSupportsWebAuthn_js_1.browserSupportsWebAuthn)()) {
          return exports._browserSupportsWebAuthnAutofillInternals.stubThis(new Promise((resolve) => resolve(false)));
        }
        const globalPublicKeyCredential = globalThis.PublicKeyCredential;
        if (globalPublicKeyCredential?.isConditionalMediationAvailable === void 0) {
          return exports._browserSupportsWebAuthnAutofillInternals.stubThis(new Promise((resolve) => resolve(false)));
        }
        return exports._browserSupportsWebAuthnAutofillInternals.stubThis(globalPublicKeyCredential.isConditionalMediationAvailable());
      }
      exports._browserSupportsWebAuthnAutofillInternals = {
        stubThis: (value) => value
      };
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/identifyAuthenticationError.js
  var require_identifyAuthenticationError = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/identifyAuthenticationError.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.identifyAuthenticationError = identifyAuthenticationError;
      var isValidDomain_js_1 = require_isValidDomain();
      var webAuthnError_js_1 = require_webAuthnError();
      function identifyAuthenticationError({ error, options }) {
        const { publicKey } = options;
        if (!publicKey) {
          throw Error("options was missing required publicKey property");
        }
        if (error.name === "AbortError") {
          if (options.signal instanceof AbortSignal) {
            return new webAuthnError_js_1.WebAuthnError({
              message: "Authentication ceremony was sent an abort signal",
              code: "ERROR_CEREMONY_ABORTED",
              cause: error
            });
          }
        } else if (error.name === "NotAllowedError") {
          return new webAuthnError_js_1.WebAuthnError({
            message: error.message,
            code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
            cause: error
          });
        } else if (error.name === "SecurityError") {
          const effectiveDomain = globalThis.location.hostname;
          if (!(0, isValidDomain_js_1.isValidDomain)(effectiveDomain)) {
            return new webAuthnError_js_1.WebAuthnError({
              message: `${globalThis.location.hostname} is an invalid domain`,
              code: "ERROR_INVALID_DOMAIN",
              cause: error
            });
          } else if (publicKey.rpId !== effectiveDomain) {
            return new webAuthnError_js_1.WebAuthnError({
              message: `The RP ID "${publicKey.rpId}" is invalid for this domain`,
              code: "ERROR_INVALID_RP_ID",
              cause: error
            });
          }
        } else if (error.name === "UnknownError") {
          return new webAuthnError_js_1.WebAuthnError({
            message: "The authenticator was unable to process the specified options, or could not create a new assertion signature",
            code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
            cause: error
          });
        }
        return error;
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/methods/startAuthentication.js
  var require_startAuthentication = __commonJS({
    "node_modules/@simplewebauthn/browser/script/methods/startAuthentication.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.startAuthentication = startAuthentication;
      var bufferToBase64URLString_js_1 = require_bufferToBase64URLString();
      var base64URLStringToBuffer_js_1 = require_base64URLStringToBuffer();
      var browserSupportsWebAuthn_js_1 = require_browserSupportsWebAuthn();
      var browserSupportsWebAuthnAutofill_js_1 = require_browserSupportsWebAuthnAutofill();
      var toPublicKeyCredentialDescriptor_js_1 = require_toPublicKeyCredentialDescriptor();
      var identifyAuthenticationError_js_1 = require_identifyAuthenticationError();
      var webAuthnAbortService_js_1 = require_webAuthnAbortService();
      var toAuthenticatorAttachment_js_1 = require_toAuthenticatorAttachment();
      async function startAuthentication(options) {
        if (!options.optionsJSON && options.challenge) {
          console.warn("startAuthentication() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.");
          options = { optionsJSON: options };
        }
        const { optionsJSON, useBrowserAutofill = false, verifyBrowserAutofillInput = true } = options;
        if (!(0, browserSupportsWebAuthn_js_1.browserSupportsWebAuthn)()) {
          throw new Error("WebAuthn is not supported in this browser");
        }
        let allowCredentials;
        if (optionsJSON.allowCredentials?.length !== 0) {
          allowCredentials = optionsJSON.allowCredentials?.map(toPublicKeyCredentialDescriptor_js_1.toPublicKeyCredentialDescriptor);
        }
        const publicKey = {
          ...optionsJSON,
          challenge: (0, base64URLStringToBuffer_js_1.base64URLStringToBuffer)(optionsJSON.challenge),
          allowCredentials
        };
        const getOptions = {};
        if (useBrowserAutofill) {
          if (!await (0, browserSupportsWebAuthnAutofill_js_1.browserSupportsWebAuthnAutofill)()) {
            throw Error("Browser does not support WebAuthn autofill");
          }
          const eligibleInputs = document.querySelectorAll("input[autocomplete$='webauthn']");
          if (eligibleInputs.length < 1 && verifyBrowserAutofillInput) {
            throw Error('No <input> with "webauthn" as the only or last value in its `autocomplete` attribute was detected');
          }
          getOptions.mediation = "conditional";
          publicKey.allowCredentials = [];
        }
        getOptions.publicKey = publicKey;
        getOptions.signal = webAuthnAbortService_js_1.WebAuthnAbortService.createNewAbortSignal();
        let credential;
        try {
          credential = await navigator.credentials.get(
            // TODO: Newer versions of Deno require this casting, revisit once we're using Deno 2.6+
            getOptions
          );
        } catch (err) {
          throw (0, identifyAuthenticationError_js_1.identifyAuthenticationError)({ error: err, options: getOptions });
        }
        if (!credential) {
          throw new Error("Authentication was not completed");
        }
        const { id, rawId, response, type } = credential;
        let userHandle = void 0;
        if (response.userHandle) {
          userHandle = (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(response.userHandle);
        }
        return {
          id,
          rawId: (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(rawId),
          response: {
            authenticatorData: (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(response.authenticatorData),
            clientDataJSON: (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(response.clientDataJSON),
            signature: (0, bufferToBase64URLString_js_1.bufferToBase64URLString)(response.signature),
            userHandle
          },
          type,
          clientExtensionResults: credential.getClientExtensionResults(),
          authenticatorAttachment: (0, toAuthenticatorAttachment_js_1.toAuthenticatorAttachment)(credential.authenticatorAttachment)
        };
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/identifySignalError.js
  var require_identifySignalError = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/identifySignalError.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.identifySignalError = identifySignalError;
      var isValidDomain_js_1 = require_isValidDomain();
      var webAuthnError_js_1 = require_webAuthnError();
      function identifySignalError({ error, options }) {
        if (error.name === "SecurityError") {
          const effectiveDomain = globalThis.location.hostname;
          if (!(0, isValidDomain_js_1.isValidDomain)(effectiveDomain)) {
            return new webAuthnError_js_1.WebAuthnError({
              message: `"${globalThis.location.hostname}" is an invalid domain`,
              code: "ERROR_INVALID_DOMAIN",
              cause: error
            });
          }
          return new webAuthnError_js_1.WebAuthnError({
            message: `The browser does not support Related Origins to enable signals for RP ID "${options.rpID}" on domain "${globalThis.location.hostname}"`,
            code: "ERROR_INVALID_RP_ID",
            cause: error
          });
        }
        if (options.signalName === "unknownCredential") {
          if (error.name === "TypeError") {
            return new webAuthnError_js_1.WebAuthnError({
              message: "credentialID is an invalid base64url string",
              code: "ERROR_SIGNAL_INVALID_ARGUMENT",
              cause: error
            });
          }
        } else if (options.signalName === "allAcceptedCredentials") {
          if (error.name === "TypeError") {
            return new webAuthnError_js_1.WebAuthnError({
              message: "userID, or an entry in allAcceptedCredentialIDs, is an invalid base64url string",
              code: "ERROR_SIGNAL_INVALID_ARGUMENT",
              cause: error
            });
          }
        } else if (options.signalName === "currentUserDetails") {
          if (error.name === "TypeError") {
            return new webAuthnError_js_1.WebAuthnError({
              message: "userID is an invalid base64url string",
              code: "ERROR_SIGNAL_INVALID_ARGUMENT",
              cause: error
            });
          }
        }
        return new webAuthnError_js_1.WebAuthnError({
          message: error.message,
          code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
          cause: error
        });
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/methods/sendSignal.js
  var require_sendSignal = __commonJS({
    "node_modules/@simplewebauthn/browser/script/methods/sendSignal.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sendSignal = sendSignal;
      var identifySignalError_js_1 = require_identifySignalError();
      async function sendSignal(opts) {
        const { signalName } = opts;
        if (signalName === "unknownCredential") {
          return _callSignalUnknownCredential(opts);
        } else if (signalName === "allAcceptedCredentials") {
          return _callSignalAllAcceptedCredentials(opts);
        } else if (signalName === "currentUserDetails") {
          return _callSignalCurrentUserDetails(opts);
        }
        throw new Error(`Received unrecognized signalName "${opts.signalName}"`);
      }
      async function _callSignalUnknownCredential(opts) {
        const globalPublicKeyCredential = globalThis.PublicKeyCredential;
        if (typeof globalPublicKeyCredential.signalUnknownCredential !== "function") {
          throw new Error("This browser does not support PublicKeyCredential.signalUnknownCredential()");
        }
        try {
          await globalPublicKeyCredential.signalUnknownCredential({
            rpId: opts.rpID,
            credentialId: opts.credentialID
          });
        } catch (err) {
          throw (0, identifySignalError_js_1.identifySignalError)({ error: err, options: opts });
        }
        return void 0;
      }
      async function _callSignalAllAcceptedCredentials(opts) {
        const globalPublicKeyCredential = globalThis.PublicKeyCredential;
        if (typeof globalPublicKeyCredential.signalAllAcceptedCredentials !== "function") {
          throw new Error("This browser does not support PublicKeyCredential.signalAllAcceptedCredentials()");
        }
        try {
          await globalPublicKeyCredential.signalAllAcceptedCredentials({
            rpId: opts.rpID,
            userId: opts.userID,
            allAcceptedCredentialIds: opts.allAcceptedCredentialIDs
          });
        } catch (err) {
          throw (0, identifySignalError_js_1.identifySignalError)({ error: err, options: opts });
        }
        return void 0;
      }
      async function _callSignalCurrentUserDetails(opts) {
        const globalPublicKeyCredential = globalThis.PublicKeyCredential;
        if (typeof globalPublicKeyCredential.signalCurrentUserDetails !== "function") {
          throw new Error("This browser does not support PublicKeyCredential.signalCurrentUserDetails()");
        }
        try {
          await globalPublicKeyCredential.signalCurrentUserDetails({
            rpId: opts.rpID,
            userId: opts.userID,
            name: opts.userName,
            displayName: opts.userDisplayName ?? ""
          });
        } catch (err) {
          throw (0, identifySignalError_js_1.identifySignalError)({ error: err, options: opts });
        }
        return void 0;
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/getBrowserCapabilities.js
  var require_getBrowserCapabilities = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/getBrowserCapabilities.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports._getBrowserCapabilitiesInternals = void 0;
      exports.getBrowserCapabilities = getBrowserCapabilities;
      async function getBrowserCapabilities() {
        if (typeof PublicKeyCredential.getClientCapabilities === "function") {
          const capabilities = await PublicKeyCredential.getClientCapabilities();
          let _userVerifyingPlatformAuthenticator = mapCapabilityToEnum(capabilities.userVerifyingPlatformAuthenticator);
          if (_userVerifyingPlatformAuthenticator === "unknown" && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
            const isUVPAA = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (isUVPAA) {
              _userVerifyingPlatformAuthenticator = "supported";
            } else {
              _userVerifyingPlatformAuthenticator = "unsupported";
            }
          }
          let _conditionalGet = mapCapabilityToEnum(capabilities.conditionalGet);
          if (_conditionalGet === "unknown" && typeof PublicKeyCredential.isConditionalMediationAvailable === "function") {
            const isCMA = await PublicKeyCredential.isConditionalMediationAvailable();
            if (isCMA) {
              _conditionalGet = "supported";
            } else {
              _conditionalGet = "unsupported";
            }
          }
          return exports._getBrowserCapabilitiesInternals.stubThis({
            conditionalCreate: mapCapabilityToEnum(capabilities.conditionalCreate),
            conditionalGet: _conditionalGet,
            hybridTransport: mapCapabilityToEnum(capabilities.hybridTransport),
            passkeyPlatformAuthenticator: mapCapabilityToEnum(capabilities.passkeyPlatformAuthenticator),
            userVerifyingPlatformAuthenticator: _userVerifyingPlatformAuthenticator,
            relatedOrigins: mapCapabilityToEnum(capabilities.relatedOrigins),
            signalAllAcceptedCredentials: mapCapabilityToEnum(capabilities.signalAllAcceptedCredentials),
            signalCurrentUserDetails: mapCapabilityToEnum(capabilities.signalCurrentUserDetails),
            signalUnknownCredential: mapCapabilityToEnum(capabilities.signalUnknownCredential)
          });
        }
        return exports._getBrowserCapabilitiesInternals.stubThis({
          conditionalCreate: "unknown",
          conditionalGet: "unknown",
          hybridTransport: "unknown",
          passkeyPlatformAuthenticator: "unknown",
          userVerifyingPlatformAuthenticator: "unknown",
          relatedOrigins: "unknown",
          signalAllAcceptedCredentials: "unknown",
          signalCurrentUserDetails: "unknown",
          signalUnknownCredential: "unknown"
        });
      }
      function mapCapabilityToEnum(value) {
        if (value === true) {
          return "supported";
        } else if (value === false) {
          return "unsupported";
        } else if (typeof value === "undefined") {
          return "unknown";
        } else {
          throw new Error("Unexpected capability value:", value);
        }
      }
      exports._getBrowserCapabilitiesInternals = {
        stubThis: (value) => value
      };
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/browserSupportsPasskeys.js
  var require_browserSupportsPasskeys = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/browserSupportsPasskeys.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.browserSupportsPasskeys = browserSupportsPasskeys;
      var browserSupportsWebAuthn_js_1 = require_browserSupportsWebAuthn();
      var getBrowserCapabilities_js_1 = require_getBrowserCapabilities();
      async function browserSupportsPasskeys() {
        if (!(0, browserSupportsWebAuthn_js_1.browserSupportsWebAuthn)()) {
          return new Promise((resolve) => resolve(false));
        }
        const capabilities = await (0, getBrowserCapabilities_js_1.getBrowserCapabilities)();
        const { passkeyPlatformAuthenticator, userVerifyingPlatformAuthenticator, hybridTransport } = capabilities;
        return passkeyPlatformAuthenticator === "supported" || hybridTransport === "supported" || userVerifyingPlatformAuthenticator === "supported";
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/helpers/platformAuthenticatorIsAvailable.js
  var require_platformAuthenticatorIsAvailable = __commonJS({
    "node_modules/@simplewebauthn/browser/script/helpers/platformAuthenticatorIsAvailable.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.platformAuthenticatorIsAvailable = platformAuthenticatorIsAvailable;
      var browserSupportsWebAuthn_js_1 = require_browserSupportsWebAuthn();
      function platformAuthenticatorIsAvailable() {
        if (!(0, browserSupportsWebAuthn_js_1.browserSupportsWebAuthn)()) {
          return new Promise((resolve) => resolve(false));
        }
        return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
    }
  });

  // node_modules/@simplewebauthn/browser/script/types/index.js
  var require_types = __commonJS({
    "node_modules/@simplewebauthn/browser/script/types/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
    }
  });

  // node_modules/@simplewebauthn/browser/script/index.js
  var require_index = __commonJS({
    "node_modules/@simplewebauthn/browser/script/index.js"(exports) {
      var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = exports && exports.__exportStar || function(m, exports2) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      __exportStar(require_startRegistration(), exports);
      __exportStar(require_startAuthentication(), exports);
      __exportStar(require_sendSignal(), exports);
      __exportStar(require_browserSupportsWebAuthn(), exports);
      __exportStar(require_browserSupportsPasskeys(), exports);
      __exportStar(require_platformAuthenticatorIsAvailable(), exports);
      __exportStar(require_browserSupportsWebAuthnAutofill(), exports);
      __exportStar(require_base64URLStringToBuffer(), exports);
      __exportStar(require_bufferToBase64URLString(), exports);
      __exportStar(require_getBrowserCapabilities(), exports);
      __exportStar(require_webAuthnAbortService(), exports);
      __exportStar(require_webAuthnError(), exports);
      __exportStar(require_types(), exports);
    }
  });
  return require_index();
})();
