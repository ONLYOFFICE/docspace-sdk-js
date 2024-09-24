import { cspErrorText, CSPApiUrl, defaultConfig } from "../constants";
import { TFrameConfig } from "../types";

export const ping = () => "pong";

/**
 * Converts an object with string, number, or boolean values into URLSearchParams.
 *
 * @param init - An object where the keys are strings and the values are either strings, numbers, or booleans.
 * @returns A new instance of URLSearchParams initialized with the provided object.
 */
export const customUrlSearchParams = (
  init: Record<string, string | number | boolean>
) => new URLSearchParams(init as Record<string, string>);

/**
 * Validates the Content Security Policy (CSP) of the target source.
 *
 * @param targetSrc - The target source URL to validate against the current origin.
 * @returns A promise that resolves if the CSP validation passes, otherwise it throws an error.
 *
 * @throws Will throw an error if the current origin is not included in the allowed domains from the target source's CSP.
 */
export const validateCSP = async (targetSrc: string) => {
  let currentSrc = window.location.origin;

  if (currentSrc.indexOf(targetSrc) !== -1) return;

  const response = await fetch(`${targetSrc}${CSPApiUrl}`);
  const res = await response.json();

  currentSrc = window.location.host || new URL(window.location.origin).host;

  const domains = [...res.response.domains].map((d) => {
    try {
      const domain = new URL(d.toLowerCase());
      const domainFull =
        domain.host + (domain.pathname !== "/" ? domain.pathname : "");

      return domainFull;
    } catch {
      return d;
    }
  });

  const passed = domains.includes(currentSrc.toLowerCase());

  if (!passed) throw new Error(cspErrorText);

  return;
};

export const getCSPErrorBody = (src: string) => {
  return `<body style=background:#f3f4f4><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300"rel=stylesheet><div style="display:flex;flex-direction:column;gap:80px;align-items:center;justify-content:flex-start;margin-top:60px;padding:0 30px"><div style=flex-shrink:0;width:211px;height:24px;position:relative><img src=${src}/static/images/logo/lightsmall.svg></div><div style=display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:flex-start;flex-shrink:0;position:relative><div style=flex-shrink:0;width:120px;height:100px;position:relative><img src=${src}/static/images/frame-error.svg></div><span style="color:#a3a9ae;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px">${cspErrorText} Please add it via <a href=${src}/portal-settings/developer-tools/javascript-sdk style="color:#4781d1;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px;text-decoration-line:underline"target=_blank>the Developer Tools section</a>.</span></div></div></body>`;
};

export const getLoaderStyle = (className: string) => {
  return `@keyframes rotate { 0%{ transform: rotate(-45deg); } 15%{ transform: rotate(45deg); } 30%{ transform: rotate(135deg); } 45%{ transform: rotate(225deg); } 60%, 100%{ transform: rotate(315deg); } } .${className} { width: 74px; height: 74px; border: 4px solid rgba(51,51,51, 0.1); border-top-color: #333333; border-radius: 50%; transform: rotate(-45deg); position: relative; box-sizing: border-box; animation: 1s linear infinite rotate; } @media (prefers-color-scheme: dark) { .${className} { border-color: rgba(204, 204, 204, 0.1); border-top-color: #CCCCCC; } }`;
};

/**
 * Retrieves the configuration from the URL parameters of the current script element.
 *
 * This function extracts the `src` attribute from the current script element,
 * decodes it, and parses the query parameters to construct a configuration object.
 * The configuration is based on the `defaultConfig` object and overrides its properties
 * with the parsed parameters.
 *
 * @returns {TFrameConfig | null} The parsed configuration object or null if the `src` attribute is empty.
 */
export const getConfigFromParams = (): TFrameConfig | null => { 
  const scriptElement = document.currentScript as HTMLScriptElement;
  const src = decodeURIComponent(scriptElement?.src || '');

  if (!src) return null;

  const searchUrl = src.split('?')[1];
  const parsedConfig: TFrameConfig = { ...defaultConfig };

  if (searchUrl) {
    const parsedParams = JSON.parse(
      `{"${searchUrl.replace(/&/g, '","').replace(/=/g, '":"')}"}`,
      (_, value) => (value === 'true' ? true : value === 'false' ? false : value)
    );

    parsedConfig.filter = { ...defaultConfig.filter };

    Object.keys(parsedParams).forEach((key) => {
      if (defaultConfig.filter && key in defaultConfig.filter) {
        (parsedConfig.filter as Record<string, string | number | boolean>)[key] = parsedParams[key];
      } else {
        (parsedConfig as unknown as Record<string, string | number | boolean>)[key] = parsedParams[key];
      }
    });
  } 

  return parsedConfig;
};

